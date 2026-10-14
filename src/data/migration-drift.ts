/**
 * Whether the connected database has actually caught up with this build's
 * migrations — not whether `main` has, which is a different question
 * `git log` already answers and this file does not duplicate.
 *
 * Reads `schema_migration_log` (0090) rather than Supabase's own
 * `supabase_migrations` schema, whose exact shape and PostgREST exposure
 * this codebase has no way to verify from outside a live project — an
 * alert built on an unverified assumption about someone else's table would
 * repeat the exact failure this file exists to catch.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { composeMigrationDriftAlert } from '../domain/messaging/migration-drift-alert.ts';
import { readPlatformAlertAddress } from './env.ts';
import { resendTransport, type MessageTransport } from './messaging.ts';

/**
 * The migration this deployed build expects to be the newest one applied.
 *
 * **Bumped by hand with every new migration that registers itself** —
 * `scripts/check_migration_receipt.py` fails the build if this and the
 * newest migration file's own `insert` disagree, so a forgotten bump is a
 * CI failure, not a false alarm nobody notices until it fires in
 * production.
 */
export const EXPECTED_MIGRATION_VERSION = '0092';
export const EXPECTED_MIGRATION_NAME = '0092_the_management_committee_and_its_subcommittees';

export interface DriftCheckResult {
  readonly drifted: boolean;
  readonly appliedVersion: string | null;
  readonly appliedName: string | null;
  readonly alerted: boolean;
  /** Why nobody was told, where drift was found and nobody was. Null otherwise. */
  readonly alertError: string | null;
}

interface LogRow {
  readonly version: string;
  readonly name: string;
}

/**
 * Checks for drift and alerts the platform's own operators if it finds
 * any. **Never throws** — the same reasoning as `alertPlatform`'s own
 * header: a check that exists to report a fault must not itself become an
 * unhandled one.
 */
export async function checkMigrationDrift(
  client: SupabaseClient,
  transport: MessageTransport | null = resendTransport(),
  to: string | null = readPlatformAlertAddress(),
): Promise<DriftCheckResult> {
  const { data, error } = await client
    .from('schema_migration_log')
    .select('version, name')
    .order('applied_at', { ascending: false })
    .limit(1);

  const applied = error !== null || data === null || data.length === 0 ? null : (data[0] as LogRow);
  const drifted = applied === null || applied.version !== EXPECTED_MIGRATION_VERSION;

  if (!drifted) {
    return {
      drifted: false,
      appliedVersion: applied!.version,
      appliedName: applied!.name,
      alerted: false,
      alertError: null,
    };
  }

  const base = {
    drifted: true as const,
    appliedVersion: applied?.version ?? null,
    appliedName: applied?.name ?? null,
  };

  if (to === null) {
    return { ...base, alerted: false, alertError: 'No alert address is configured (PLATFORM_ALERT_TO).' };
  }
  if (transport === null) {
    return { ...base, alerted: false, alertError: 'No email provider is configured, so nothing was sent.' };
  }

  const alert = composeMigrationDriftAlert({
    expectedVersion: EXPECTED_MIGRATION_VERSION,
    expectedName: EXPECTED_MIGRATION_NAME,
    appliedVersion: applied?.version ?? null,
    appliedName: applied?.name ?? null,
  });

  try {
    await transport.send(to, alert.subject, alert.body);
    return { ...base, alerted: true, alertError: null };
  } catch (err) {
    return { ...base, alerted: false, alertError: err instanceof Error ? err.message : 'The provider rejected the alert.' };
  }
}
