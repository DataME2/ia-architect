/**
 * Erasure, retention, and the club's own copy of everything.
 *
 * Thin on purpose. The verdicts live in `src/domain/privacy/` and the acts
 * live in the database — `app_decide_erasure`, `app_dispose_person`,
 * `app_run_retention_review` — because each of them deletes a Person or
 * refuses to, and a rule that consequential belongs where it cannot be
 * routed around. This module is the join.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { RetentionBasis, RetentionBasisKind } from '../domain/privacy/types.ts';
import type { RetentionState } from '../domain/privacy/retention.ts';

export interface ErasureRequestRow {
  readonly id: string;
  readonly personId: string | null;
  readonly personName: string;
  readonly requestedAt: string;
  readonly requestDetail: string | null;
  readonly state: 'received' | 'honoured' | 'refused' | 'withdrawn';
  readonly decidedAt: string | null;
  readonly refusedBases: readonly RetentionBasis[];
  readonly honourableFrom: string | null;
}

export interface RetentionReviewRow {
  readonly id: string;
  readonly personId: string | null;
  readonly personName: string;
  readonly state: RetentionState;
  readonly detail: string | null;
  readonly reviewedAt: string;
  readonly disposedAt: string | null;
}

interface PersonNameRow {
  readonly id: string;
  readonly preferred_name: string | null;
  readonly legal_given_names: string;
  readonly legal_family_name: string;
}

function nameMap(rows: readonly PersonNameRow[]): ReadonlyMap<string, string> {
  return new Map(rows.map((p) => [
    p.id,
    `${p.preferred_name?.trim() || p.legal_given_names} ${p.legal_family_name}`,
  ]));
}

/**
 * The names behind a set of ids.
 *
 * An erased Person leaves `person_id` null on the row that recorded the
 * request (BR132), so a missing name is the ordinary case here rather than
 * an error — and it is reported as **"Erased"**, which is the true answer,
 * not as a blank that reads like a bug.
 */
async function namesFor(
  client: SupabaseClient,
  clubId: string,
  ids: readonly (string | null)[],
): Promise<ReadonlyMap<string, string>> {
  const present = ids.filter((id): id is string => id !== null);
  if (present.length === 0) return new Map();
  const { data } = await client
    .from('person')
    .select('id, preferred_name, legal_given_names, legal_family_name')
    .eq('club_id', clubId)
    .in('id', present);
  return nameMap((data ?? []) as PersonNameRow[]);
}

export async function loadErasureRequests(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly ErasureRequestRow[]> {
  const { data } = await client
    .from('erasure_request')
    .select('id, person_id, requested_at, request_detail, state, decided_at, refused_bases, honourable_from')
    .eq('club_id', clubId)
    .order('requested_at', { ascending: false });

  const rows = data ?? [];
  const names = await namesFor(client, clubId, rows.map((r: { person_id: string | null }) => r.person_id));

  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    personId: r.person_id as string | null,
    personName: r.person_id === null ? 'Erased' : names.get(r.person_id as string) ?? 'Erased',
    requestedAt: r.requested_at as string,
    requestDetail: r.request_detail as string | null,
    state: r.state as ErasureRequestRow['state'],
    decidedAt: r.decided_at as string | null,
    refusedBases: (r.refused_bases ?? []) as readonly RetentionBasis[],
    honourableFrom: r.honourable_from as string | null,
  }));
}

export async function loadRetentionReviews(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly RetentionReviewRow[]> {
  const { data } = await client
    .from('retention_review')
    .select('id, person_id, state, detail, reviewed_at, disposed_at')
    .eq('club_id', clubId)
    .is('disposed_at', null)
    .order('state', { ascending: true });

  const rows = data ?? [];
  const names = await namesFor(client, clubId, rows.map((r: { person_id: string | null }) => r.person_id));

  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    personId: r.person_id as string | null,
    personName: r.person_id === null ? 'Erased' : names.get(r.person_id as string) ?? 'Erased',
    state: r.state as RetentionState,
    detail: r.detail as string | null,
    reviewedAt: r.reviewed_at as string,
    disposedAt: r.disposed_at as string | null,
  }));
}

export async function loadRetentionBases(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<readonly RetentionBasis[]> {
  const { data } = await client
    .from('retention_basis')
    .select('basis, expires_on, detail')
    .eq('club_id', clubId)
    .eq('person_id', personId);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    basis: r.basis as RetentionBasisKind,
    expiresOn: r.expires_on as string | null,
    detail: r.detail as string | null,
  }));
}

export async function recordRetentionBasis(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  basis: RetentionBasisKind,
  expiresOn: string | null,
  detail: string | null,
): Promise<string | null> {
  const { error } = await client.from('retention_basis').insert({
    club_id: clubId, person_id: personId, basis, expires_on: expiresOn, detail,
  });
  return error?.message ?? null;
}

export async function recordErasureRequest(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  requestedByPersonId: string | null,
  requestDetail: string,
): Promise<string | null> {
  const { error } = await client.from('erasure_request').insert({
    club_id: clubId,
    person_id: personId,
    requested_by_person_id: requestedByPersonId,
    request_detail: requestDetail || null,
  });
  return error?.message ?? null;
}

/** Returns the outcome the database decided — `honoured` or `refused`. */
export async function decideErasure(
  client: SupabaseClient,
  requestId: string,
): Promise<{ outcome: string } | { error: string }> {
  const { data, error } = await client.rpc('app_decide_erasure', { p_request_id: requestId });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { outcome: String(data) };
}

export async function runRetentionReview(
  client: SupabaseClient,
  clubId: string,
): Promise<{ count: number } | { error: string }> {
  const { data, error } = await client.rpc('app_run_retention_review', { p_club_id: clubId });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { count: Number(data ?? 0) };
}

export async function disposePerson(
  client: SupabaseClient,
  reviewId: string,
): Promise<string | null> {
  const { error } = await client.rpc('app_dispose_person', { p_review_id: reviewId });
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

export async function transferAuthority(
  client: SupabaseClient,
  clubId: string,
): Promise<{ moved: number } | { error: string }> {
  const { data, error } = await client.rpc('app_transfer_authority', { p_club_id: clubId });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { moved: Number(data ?? 0) };
}

/** BR68. The claim the technology layer has been making since August. */
export async function exportClubData(
  client: SupabaseClient,
  clubId: string,
): Promise<unknown | { error: string }> {
  const { data, error } = await client.rpc('export_club_data', { p_club_id: clubId });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return data;
}
