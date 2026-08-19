'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { buildSubmissionPack } from '../../../domain/submission/build-pack.ts';
import type { SubmissionState } from '../../../domain/submission/types.ts';
import {
  loadPack,
  nextPackVersion,
  recordHandover,
  recordSubmissionOutcome,
  savePack,
} from '../../../data/packs.ts';
import { loadPackCandidates, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { todayIn } from '../../../web/today.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

/**
 * Generate the next version of the pack.
 *
 * Generating is **not** sending. No submission record is written and no
 * registration status moves — this only freezes an artifact. The pack goes
 * nowhere until someone records a handover against it, which is the
 * distinction BR60 turns on.
 */
export async function generatePackAction(formData: FormData): Promise<void> {
  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') throw new Error('Missing season.');

  // BR59: an explicit choice each time, never inherited from a default. A
  // single file carrying hundreds of children's photographs is a decision
  // someone should make on purpose.
  const includePhotographs = formData.get('includePhotographs') === 'on';

  const { client, user, tenant } = await requireTenant();

  const candidates = await loadPackCandidates(client, tenant.clubId, seasonId);
  const version = await nextPackVersion(client, tenant.clubId, seasonId);

  const pack = buildSubmissionPack(candidates, {
    clubId: tenant.clubId,
    seasonId,
    version,
    generatedAt: new Date().toISOString(),
    generatedByUserId: user.id,
    includePhotographs,
    asAt: todayIn(),
  });

  await savePack(client, pack, user.id);

  revalidatePath('/registrar/pack');
  redirect(`/registrar/pack/${version}`);
}

/**
 * Record that a pack left the building, and through what channel.
 *
 * BR59 requires the channel against the pack: once generated it is a file
 * containing hundreds of children's legal names and dates of birth, and it
 * can be emailed or forwarded in ways the platform cannot see. A recorded
 * channel is one of the few controls that still applies afterwards.
 */
export async function recordHandoverAction(formData: FormData): Promise<void> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  const channel = String(formData.get('channel') ?? '').trim();

  if (seasonId === '' || !Number.isInteger(version) || version < 1) {
    throw new Error('Missing pack identifiers.');
  }
  if (channel === '') throw new Error('Record how the pack was handed over.');

  const { client, user, tenant } = await requireTenant();

  const pack = await loadPack(client, tenant.clubId, seasonId, version);
  if (pack === null) throw new Error('Pack not found.');

  await recordHandover(client, tenant.clubId, pack, channel, user.id);

  revalidatePath(`/registrar/pack/${version}`);
  revalidatePath('/registrar/pack');
  revalidatePath('/registrar');
}

const OUTCOMES: readonly SubmissionState[] = ['sent', 'confirmed_present', 'rejected'];

function parseOutcome(value: string): SubmissionState {
  const match = OUTCOMES.find((o) => o === value);
  if (match === undefined) throw new Error(`Unknown outcome: ${value}`);
  return match;
}

/**
 * Record what the federation said about one person.
 *
 * The only route to `COMPLETE`, and therefore the only route to eligibility.
 * A rejection reason is stored verbatim — over a season those reasons
 * reconstruct the import specification nobody has ever given the club
 * (open question #44).
 */
export async function recordOutcomeAction(formData: FormData): Promise<void> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const version = Number(formData.get('version') ?? 0);
  const recordId = String(formData.get('recordId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const outcome = parseOutcome(String(formData.get('outcome') ?? ''));
  const reasonRaw = String(formData.get('rejectionReason') ?? '').trim();

  if (seasonId === '' || recordId === '' || personId === '') {
    throw new Error('Missing record identifiers.');
  }

  const { client, user, tenant } = await requireTenant();

  await recordSubmissionOutcome(
    client,
    tenant.clubId,
    seasonId,
    recordId,
    personId,
    outcome,
    reasonRaw === '' ? null : reasonRaw,
    user.id,
  );

  revalidatePath(`/registrar/pack/${version}`);
  revalidatePath('/registrar');
}
