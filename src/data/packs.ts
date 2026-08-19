/**
 * Reading and writing Registration Submission Packs (C16, BR58–BR60).
 *
 * The pack itself is built by the pure `buildSubmissionPack`; this module
 * only persists the result and reads it back. The division matters: what
 * goes in a pack is a business decision with tests, while this is plumbing.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { recordsForHandover } from '../domain/submission/build-pack.ts';
import { statusAfterHandover, statusAfterSubmissionOutcome } from '../domain/submission/status.ts';
import type { SubmissionPack, SubmissionState } from '../domain/submission/types.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { RegistrationRow, SubmissionPackRow, SubmissionRecordRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

/** Packs for a season, newest version first. */
export async function loadPacks(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly SubmissionPackRow[]> {
  return unwrap<SubmissionPackRow[]>(
    'submission_pack',
    await client
      .from('submission_pack')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .order('version', { ascending: false }),
  );
}

/**
 * The version a new pack would take.
 *
 * BR58: monotonic per club and season, so a resend is distinguishable from a
 * first send — which matters when the recipient has already imported one of
 * them.
 */
export async function nextPackVersion(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<number> {
  const packs = await loadPacks(client, clubId, seasonId);
  return (packs[0]?.version ?? 0) + 1;
}

export async function loadPack(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  version: number,
): Promise<SubmissionPackRow | null> {
  const rows = unwrap<SubmissionPackRow[]>(
    'submission_pack',
    await client
      .from('submission_pack')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .eq('version', version)
      .limit(1),
  );
  return rows[0] ?? null;
}

export async function loadPackRecords(
  client: SupabaseClient,
  clubId: string,
  packId: string,
): Promise<readonly SubmissionRecordRow[]> {
  return unwrap<SubmissionRecordRow[]>(
    'submission_record',
    await client
      .from('submission_record')
      .select('*')
      .eq('club_id', clubId)
      .eq('submission_pack_id', packId)
      .order('updated_at', { ascending: true }),
  );
}

/**
 * Persist a generated pack.
 *
 * Writes the frozen rows into `manifest` so the artifact stays true to what
 * was generated even after the underlying `person` rows change (BR58).
 * **No submission records are written here** — generating a pack is not
 * handing it over, and until it is handed over nothing has been *sent*.
 */
export async function savePack(
  client: SupabaseClient,
  pack: SubmissionPack,
  actorUserId: string,
): Promise<SubmissionPackRow> {
  const inserted = unwrap<SubmissionPackRow>(
    'submission_pack',
    await client
      .from('submission_pack')
      .insert({
        club_id: pack.clubId,
        season_id: pack.seasonId,
        version: pack.version,
        generated_at: pack.generatedAt,
        generated_by_user_id: pack.generatedByUserId,
        manifest: pack.rows,
      })
      .select('*')
      .single<SubmissionPackRow>(),
  );

  await recordAudit(client, pack.clubId, actorUserId, {
    action: 'submission_pack_generated',
    entity: 'submission_pack',
    entityId: inserted.id,
    detail: {
      version: pack.version,
      included: pack.rows.length,
      excluded: pack.excluded.length,
      includesPhotographs: pack.includesPhotographs,
    },
  });

  return inserted;
}

/**
 * Record that a pack was handed over, through a named channel.
 *
 * Three things happen, and the third is the one BR60 is about:
 *
 * 1. the pack is stamped with the channel and time (BR59, and the only
 *    update its RLS policy permits — and only while `handed_over_at` is
 *    still null, so a handover cannot be quietly rewritten);
 * 2. a `submission_record` per person is created in state **`sent`**;
 * 3. each registration moves to `PENDING_EXTERNAL_REGISTRATION` — never to
 *    `COMPLETE`. Sending is the club's act; registering is the federation's,
 *    and only the second creates eligibility (BR43).
 */
export async function recordHandover(
  client: SupabaseClient,
  clubId: string,
  pack: SubmissionPackRow,
  channel: string,
  actorUserId: string,
): Promise<void> {
  if (pack.handed_over_at !== null) {
    throw new QueryError('submission_pack', 'This pack has already been handed over.');
  }

  const handedOverAt = new Date().toISOString();

  const { error: stampError } = await client
    .from('submission_pack')
    .update({ handover_channel: channel, handed_over_at: handedOverAt })
    .eq('id', pack.id)
    .eq('club_id', clubId);
  if (stampError !== null) throw new QueryError('submission_pack', stampError.message);

  // `recordsForHandover` is the domain's answer, and every record it
  // produces starts as `sent`. Reconstructed from the stored manifest so
  // this reflects the pack as generated, not the world as it is now.
  const records = recordsForHandover({
    clubId,
    seasonId: pack.season_id,
    version: pack.version,
    generatedAt: pack.generated_at,
    generatedByUserId: pack.generated_by_user_id,
    includesPhotographs: pack.manifest.some((r) => r.photoPath !== null),
    rows: pack.manifest,
    manifest: pack.manifest.map((r) => r.personId),
    excluded: [],
  });

  if (records.length > 0) {
    const { error: recordError } = await client.from('submission_record').insert(
      records.map((record) => ({
        club_id: clubId,
        submission_pack_id: pack.id,
        person_id: record.personId,
        state: record.state,
      })),
    );
    if (recordError !== null) throw new QueryError('submission_record', recordError.message);
  }

  // Move each covered registration to the eligibility gate.
  const personIds = pack.manifest.map((r) => r.personId);
  if (personIds.length > 0) {
    const affected = unwrap<RegistrationRow[]>(
      'registration',
      await client
        .from('registration')
        .select('*')
        .eq('club_id', clubId)
        .eq('season_id', pack.season_id)
        .in('person_id', personIds),
    );

    for (const registration of affected) {
      const next = statusAfterHandover(registration.status);
      if (next === registration.status) continue;
      const { error } = await client
        .from('registration')
        .update({ status: next })
        .eq('id', registration.id)
        .eq('club_id', clubId);
      if (error !== null) throw new QueryError('registration', error.message);
    }
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'submission_pack_handed_over',
    entity: 'submission_pack',
    entityId: pack.id,
    detail: { version: pack.version, channel, people: personIds.length, handedOverAt },
  });
}

/**
 * Record what the federation said about one person in a pack.
 *
 * This is the only route to `COMPLETE`, and therefore the only route to
 * eligibility (BR43, BR60). A rejection sends the registration back to the
 * registrar with the reason recorded verbatim — over a season those reasons
 * reconstruct the validation specification nobody has ever given the club
 * (open question #44).
 */
export async function recordSubmissionOutcome(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  recordId: string,
  personId: string,
  outcome: SubmissionState,
  rejectionReason: string | null,
  actorUserId: string,
): Promise<void> {
  const { error: recordError } = await client
    .from('submission_record')
    .update({
      state: outcome,
      rejection_reason: outcome === 'rejected' ? rejectionReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('club_id', clubId);
  if (recordError !== null) throw new QueryError('submission_record', recordError.message);

  const registrations = unwrap<RegistrationRow[]>(
    'registration',
    await client
      .from('registration')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .eq('person_id', personId)
      .limit(1),
  );

  const registration = registrations[0];
  if (registration !== undefined) {
    const next = statusAfterSubmissionOutcome(registration.status, outcome);
    if (next !== registration.status) {
      const { error } = await client
        .from('registration')
        .update({ status: next })
        .eq('id', registration.id)
        .eq('club_id', clubId);
      if (error !== null) throw new QueryError('registration', error.message);
    }
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'submission_outcome_recorded',
    entity: 'submission_record',
    entityId: recordId,
    detail: { outcome, personId, rejectionReason },
  });
}
