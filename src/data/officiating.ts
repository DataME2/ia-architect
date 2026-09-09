/**
 * Reads and writes for the referee record (scope 33, WP1).
 *
 * Separate from `queries.ts` for the reason `performance.ts` is: these
 * tables are narrowed to the roles that appoint, so a query here returning
 * nothing is the ordinary answer for a treasurer rather than a fault, and
 * mixing them into the general loader would blur that.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Candidate } from '../domain/officiating/conflicts.ts';
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

export interface DesignationFixture {
  readonly fixtureId: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly opponent: string;
  readonly competition: string | null;
  readonly homeAway: string;
  readonly teamId: string | null;
  readonly appointed: readonly {
    personId: string;
    name: string;
    role: string;
    state: string;
    appointedBy: string;
  }[];
}

/** Fixtures a coordinator might still be filling, soonest first. */
export async function loadDesignationFixtures(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly DesignationFixture[]> {
  const { data: fixtures } = await client
    .from('fixture')
    .select('id, played_on, kick_off, opponent, competition, home_away, team_id, status')
    .eq('club_id', clubId)
    .eq('season_id', seasonId)
    .neq('status', 'cancelled')
    .order('played_on', { ascending: true });

  const rows = (fixtures ?? []) as Record<string, string | null>[];
  if (rows.length === 0) return [];

  const [{ data: appointments }, { data: people }] = await Promise.all([
    client
      .from('match_official_appointment')
      .select('fixture_id, person_id, role, state, appointed_by')
      .eq('club_id', clubId),
    client
      .from('person')
      .select('id, legal_given_names, legal_family_name')
      .eq('club_id', clubId),
  ]);

  const nameOf = new Map(
    ((people ?? []) as PersonNameRow[]).map((row) => [
      row.id,
      (row.legal_given_names + ' ' + row.legal_family_name).trim(),
    ]),
  );

  return rows.map((f) => ({
    fixtureId: String(f.id),
    playedOn: String(f.played_on),
    kickOff: f.kick_off ?? null,
    opponent: String(f.opponent),
    competition: f.competition ?? null,
    homeAway: String(f.home_away),
    teamId: f.team_id ?? null,
    appointed: ((appointments ?? []) as Record<string, string>[])
      .filter((a) => a.fixture_id === f.id)
      .map((a) => ({
        personId: String(a.person_id),
        name: nameOf.get(String(a.person_id)) ?? 'Unknown person',
        role: String(a.role),
        state: String(a.state),
        appointedBy: String(a.appointed_by),
      })),
  }));
}

/**
 * Every official on the roster, with what the conflict engine needs to
 * judge them against one fixture.
 *
 * Assembled here rather than in the engine because it is all I/O, and from
 * separate reads rather than a join for the reason `loadReferees` gives:
 * each table carries its own policy, and a join reports "no candidates"
 * when what actually happened is that one read was refused.
 */
export async function loadCandidates(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  fixture: DesignationFixture,
): Promise<readonly Candidate[]> {
  const referees = await loadReferees(client, clubId);
  const active = referees.filter(
    (r) => r.retiredOn === null || r.retiredOn > fixture.playedOn,
  );
  if (active.length === 0) return [];

  const [
    { data: appearances },
    { data: teamMembers },
    { data: guardianships },
    { data: suspensions },
    { data: otherAppointments },
    { data: memberships },
    { data: personRoles },
    { data: links },
  ] = await Promise.all([
    client.from('appearance').select('person_id').eq('club_id', clubId)
      .eq('fixture_id', fixture.fixtureId),
    fixture.teamId === null
      ? Promise.resolve({ data: [] as Record<string, string>[] })
      : client.from('team_member').select('person_id, role').eq('club_id', clubId)
          .eq('team_id', fixture.teamId),
    client.from('guardianship').select('person_id, guardian_person_id').eq('club_id', clubId),
    client.from('referee_suspension').select('person_id, starts_on, ends_on').eq('club_id', clubId),
    client
      .from('match_official_appointment')
      .select('person_id, state, fixture_id, fixture!inner(played_on, kick_off)')
      .eq('club_id', clubId)
      .in('state', ['proposed', 'accepted']),
    client.from('club_membership').select('user_id, role').eq('club_id', clubId),
    client.from('person_role').select('person_id, role').eq('club_id', clubId)
      .eq('season_id', seasonId),
    // Which accounts belong to which Person, so a committee member's
    // *membership* role counts toward BR11. Only asserted links count
    // (decision 10) — an unlinked account is not evidence of anything.
    client.from('account_person').select('user_id, person_id').eq('club_id', clubId),
  ]);

  const personOfUser = new Map(
    ((links ?? []) as Record<string, string>[]).map((l) => [String(l.user_id), String(l.person_id)]),
  );

  const playedHere = new Set(
    ((appearances ?? []) as Record<string, string>[]).map((a) => String(a.person_id)),
  );
  const inTeam = new Set(
    ((teamMembers ?? []) as Record<string, string>[]).map((m) => String(m.person_id)),
  );
  const guardianOfPlayer = new Set(
    ((guardianships ?? []) as Record<string, string>[])
      .filter((g) => playedHere.has(String(g.person_id)))
      .map((g) => String(g.guardian_person_id)),
  );

  const suspendedThen = new Set(
    ((suspensions ?? []) as Record<string, string | null>[])
      .filter(
        (s) =>
          String(s.starts_on) <= fixture.playedOn &&
          (s.ends_on === null || String(s.ends_on) >= fixture.playedOn),
      )
      .map((s) => String(s.person_id)),
  );

  const sameDay = new Map<string, number>();
  const clashing = new Set<string>();
  for (const a of (otherAppointments ?? []) as Record<string, unknown>[]) {
    if (a.fixture_id === fixture.fixtureId) continue;
    const f = a.fixture as { played_on?: string; kick_off?: string | null } | null;
    if (f === null || f.played_on !== fixture.playedOn) continue;
    const person = String(a.person_id);
    sameDay.set(person, (sameDay.get(person) ?? 0) + 1);
    if (fixture.kickOff !== null && f.kick_off === fixture.kickOff) clashing.add(person);
  }

  // The club roles BR11 cares about: everything except officiating.
  const rolesOf = new Map<string, string[]>();
  const add = (personId: string, role: string) => {
    const existing = rolesOf.get(personId) ?? [];
    existing.push(role);
    rolesOf.set(personId, existing);
  };
  for (const m of (memberships ?? []) as Record<string, string>[]) {
    const person = personOfUser.get(String(m.user_id));
    if (person !== undefined) add(person, String(m.role));
  }
  for (const r of (personRoles ?? []) as Record<string, string>[]) {
    if (r.role !== 'referee') add(String(r.person_id), String(r.role));
  }
  for (const m of (teamMembers ?? []) as Record<string, string>[]) {
    add(String(m.person_id), String(m.role));
  }

  const availability = await Promise.all(
    active.map(async (r) => {
      const { data } = await client.rpc('app_referee_available_on', {
        p_person_id: r.personId,
        p_season_id: seasonId,
        p_on: fixture.playedOn,
        p_kick_off: fixture.kickOff,
      });
      return [r.personId, data === true] as const;
    }),
  );
  const availableOf = new Map(availability);

  const alreadyHere = new Set(fixture.appointed.map((a) => a.personId));

  return active
    .filter((r) => !alreadyHere.has(r.personId))
    .map((r) => ({
      personId: r.personId,
      name: r.name,
      classification:
        r.classifications
          .filter((c) => c.effectiveFrom <= fixture.playedOn)
          .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]?.level ?? null,
      accreditations: r.accreditations.map((a) => ({
        kind: a.kind,
        expiresOn: a.expiresOn,
        verifiedAt: a.verifiedAt,
      })),
      playedInFixture: playedHere.has(r.personId),
      inFixtureTeam: inTeam.has(r.personId),
      guardianInFixture: guardianOfPlayer.has(r.personId),
      suspended: suspendedThen.has(r.personId),
      clashesAtKickOff: clashing.has(r.personId),
      clubRoles: rolesOf.get(r.personId) ?? [],
      sameDayAppointments: sameDay.get(r.personId) ?? 0,
      available: availableOf.get(r.personId) ?? false,
    }));
}
