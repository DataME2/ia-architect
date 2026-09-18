/**
 * Reads and writes for a Player's answer to a fixture (BR62, BR63).
 *
 * `designations.ts`'s shape, moved: who may answer is migration 0054's
 * question (`app_may_answer_designation`, reused rather than re-derived),
 * so nothing here re-checks age or guardianship — only reads the row and
 * records the attempt.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ParticipationStatus } from '../web/participation-answer.ts';
import { QueryError } from './queries.ts';
import type { ParticipationResponseRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface ParticipationView {
  readonly status: ParticipationStatus;
  readonly reason: string | null;
}

/** One player's answer to one fixture, or null if they have not answered. */
export async function loadParticipationResponse(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
  personId: string,
): Promise<ParticipationView | null> {
  const rows = unwrap<ParticipationResponseRow[]>(
    'participation_response',
    await client
      .from('participation_response')
      .select('*')
      .eq('club_id', clubId)
      .eq('fixture_id', fixtureId)
      .eq('person_id', personId)
      .limit(1),
  );
  const row = rows[0];
  return row === undefined ? null : { status: row.status, reason: row.reason };
}

/** Every response to one fixture, for the coach's roster banner — keyed by player. */
export async function loadFixtureParticipationResponses(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
): Promise<ReadonlyMap<string, ParticipationView>> {
  const rows = unwrap<ParticipationResponseRow[]>(
    'participation_response',
    await client
      .from('participation_response')
      .select('*')
      .eq('club_id', clubId)
      .eq('fixture_id', fixtureId),
  );
  return new Map(rows.map((r) => [r.person_id, { status: r.status, reason: r.reason }]));
}

/**
 * Record an answer (BR62/BR63). `responderPersonId` is the signed-in
 * person's own Person at this club, never chosen on the screen — the
 * database checks it holds authority for `personId` and refuses otherwise.
 */
export async function recordParticipationResponse(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
  personId: string,
  responderPersonId: string,
  status: ParticipationStatus,
  reason: string | null,
): Promise<string | null> {
  const { error } = await client
    .from('participation_response')
    .upsert(
      {
        club_id: clubId,
        fixture_id: fixtureId,
        person_id: personId,
        status,
        reason,
        responded_by_person_id: responderPersonId,
        responded_at: new Date().toISOString(),
      },
      { onConflict: 'fixture_id,person_id' },
    );

  // The trigger's messages name their rule and are written for a person —
  // passed through rather than replaced with "something went wrong".
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}
