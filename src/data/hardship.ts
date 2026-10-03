/**
 * Hardship requests (scope 82, BR164): a family asks, the committee
 * decides. Every refusal is the database's (0077) — who may ask, who may
 * decide, that an approval has a date and a decline a reason.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';

export interface HardshipRequest {
  readonly id: string;
  readonly registrationId: string;
  readonly personId: string;
  readonly playerName: string;
  readonly reason: string;
  readonly state: 'requested' | 'approved' | 'declined';
  readonly requestedAt: string;
  readonly validUntil: string | null;
  readonly decisionNote: string | null;
}

/** Requests the caller may read, newest first: the committee's queue, or a family's own. */
export async function loadHardshipRequests(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[] | null = null,
): Promise<readonly HardshipRequest[]> {
  let q = client
    .from('hardship_request')
    .select('id, registration_id, person_id, reason, state, requested_at, valid_until, decision_note')
    .eq('club_id', clubId)
    .order('requested_at', { ascending: false });
  if (personIds !== null) q = q.in('person_id', personIds);
  const { data, error } = await q;
  if (error !== null) throw new QueryError('hardship_request', error.message);
  const rows = (data ?? []) as Record<string, string | null>[];
  if (rows.length === 0) return [];

  const { data: people } = await client
    .from('person')
    .select('id, legal_given_names, legal_family_name, preferred_name')
    .eq('club_id', clubId)
    .in('id', [...new Set(rows.map((r) => r.person_id as string))]);
  const nameOf = new Map(
    ((people ?? []) as { id: string; legal_given_names: string; legal_family_name: string; preferred_name: string | null }[])
      .map((p) => [p.id, `${p.preferred_name ?? p.legal_given_names} ${p.legal_family_name}`]),
  );

  return rows.map((r) => ({
    id: r.id as string,
    registrationId: r.registration_id as string,
    personId: r.person_id as string,
    playerName: nameOf.get(r.person_id as string) ?? 'A player',
    reason: r.reason as string,
    state: r.state as HardshipRequest['state'],
    requestedAt: r.requested_at as string,
    validUntil: r.valid_until ?? null,
    decisionNote: r.decision_note ?? null,
  }));
}

/** A family asks (the requester is the signed-in person, never the form). */
export async function requestHardship(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  personId: string,
  requestedByPersonId: string,
  reason: string,
): Promise<string | null> {
  const { error } = await client.from('hardship_request').insert({
    club_id: clubId,
    registration_id: registrationId,
    person_id: personId,
    requested_by_person_id: requestedByPersonId,
    reason,
  });
  if (error === null) return null;
  if (error.code === '23505') return 'A request for this player is already waiting for the committee.';
  if (error.code === '42501') return 'Only whoever answers for this player may ask (BR164).';
  return error.message;
}

/** The committee decides (BR164). */
export async function decideHardship(
  client: SupabaseClient,
  requestId: string,
  approve: boolean,
  validUntil: string | null,
  note: string | null,
): Promise<string | null> {
  const { error } = await client.rpc('app_decide_hardship', {
    p_request_id: requestId,
    p_approve: approve,
    p_valid_until: validUntil,
    p_note: note,
  });
  return error === null ? null : error.message;
}
