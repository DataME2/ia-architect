/**
 * Reads and writes for the referee record (scope 33, WP1).
 *
 * Separate from `queries.ts` for the reason `performance.ts` is: these
 * tables are narrowed to the roles that appoint, so a query here returning
 * nothing is the ordinary answer for a treasurer rather than a fault, and
 * mixing them into the general loader would blur that.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { RefereeSummary } from '../web/referee-view.ts';

interface ProfileRow {
  readonly person_id: string;
  readonly official_number: string | null;
  readonly started_on: string | null;
  readonly retired_on: string | null;
}

interface PersonNameRow {
  readonly id: string;
  readonly legal_given_names: string;
  readonly legal_family_name: string;
  readonly preferred_name: string | null;
}

/**
 * Every official this club keeps a record of, with their history.
 *
 * Three reads rather than a join, deliberately: each table carries its own
 * policy, and a join would report "no referees" when what actually happened
 * is that one of the three was refused. Separate reads make the refusal
 * visible where it happens.
 */
export async function loadReferees(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly RefereeSummary[]> {
  const { data: profiles, error } = await client
    .from('referee_profile')
    .select('person_id, official_number, started_on, retired_on')
    .eq('club_id', clubId);

  // Not thrown. A coordinator sees the roster; a treasurer sees nothing,
  // and that is the narrowing working rather than an error to report.
  if (error !== null || profiles === null || profiles.length === 0) return [];

  const ids = (profiles as ProfileRow[]).map((p) => p.person_id);

  const [{ data: people }, { data: classifications }, { data: accreditations }] =
    await Promise.all([
      client
        .from('person')
        .select('id, legal_given_names, legal_family_name, preferred_name')
        .in('id', ids),
      client
        .from('referee_classification')
        .select('person_id, level, effective_from, sighted_at')
        .eq('club_id', clubId)
        .order('effective_from', { ascending: false }),
      client
        .from('referee_accreditation')
        .select('person_id, kind, identifier, issued_on, expires_on, verified_at')
        .eq('club_id', clubId)
        .order('expires_on', { ascending: true }),
    ]);

  const nameOf = new Map(
    ((people ?? []) as PersonNameRow[]).map((p) => [
      p.id,
      `${p.legal_given_names} ${p.legal_family_name}`.trim(),
    ]),
  );

  return (profiles as ProfileRow[]).map((profile) => ({
    personId: profile.person_id,
    name: nameOf.get(profile.person_id) ?? 'Unknown person',
    officialNumber: profile.official_number,
    startedOn: profile.started_on,
    retiredOn: profile.retired_on,
    classifications: ((classifications ?? []) as Record<string, string | null>[])
      .filter((c) => c.person_id === profile.person_id)
      .map((c) => ({
        level: String(c.level),
        effectiveFrom: String(c.effective_from),
        sightedAt: c.sighted_at ?? null,
      })),
    accreditations: ((accreditations ?? []) as Record<string, string | null>[])
      .filter((a) => a.person_id === profile.person_id)
      .map((a) => ({
        kind: String(a.kind),
        identifier: a.identifier ?? null,
        issuedOn: a.issued_on ?? null,
        expiresOn: a.expires_on ?? null,
        verifiedAt: a.verified_at ?? null,
      })),
  }));
}

/**
 * People at this club who could be added to the roster.
 *
 * **Not filtered to those already holding the `referee` person role.** A
 * club records somebody as an official before, or instead of, giving them a
 * season role — and a picker that showed only people already marked
 * referee would be empty on the day the roster is first built, which is the
 * only day it matters.
 */
export async function loadRefereeCandidates(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly { personId: string; name: string }[]> {
  const { data } = await client
    .from('person')
    .select('id, legal_given_names, legal_family_name')
    .eq('club_id', clubId)
    .is('merged_into_person_id', null)
    .order('legal_family_name', { ascending: true });

  return ((data ?? []) as PersonNameRow[]).map((p) => ({
    personId: p.id,
    name: `${p.legal_given_names} ${p.legal_family_name}`.trim(),
  }));
}
