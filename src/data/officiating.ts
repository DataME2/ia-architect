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
import type {
  AvailabilityWindow,
  UnavailabilityRange,
} from '../web/availability-view.ts';
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
        .select('id, person_id, level, effective_from, sighted_at')
        .eq('club_id', clubId)
        .order('effective_from', { ascending: false }),
      client
        .from('referee_accreditation')
        .select('id, person_id, kind, identifier, issued_on, expires_on, verified_at')
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
        id: String(c.id),
        level: String(c.level),
        effectiveFrom: String(c.effective_from),
        sightedAt: c.sighted_at ?? null,
      })),
    accreditations: ((accreditations ?? []) as Record<string, string | null>[])
      .filter((a) => a.person_id === profile.person_id)
      .map((a) => ({
        id: String(a.id),
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
  /** So the fixture picker can say a game is already played, not just list it identically to one still needing designation. */
  readonly status: string;
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
    status: String(f.status),
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
      // The classification in force on the day (BR110's history, read at a
      // date rather than as a current value) — **and only if the club has
      // sighted it** (BR138).
      //
      // `referee_classification`'s own comment has said since it was
      // written that a level somebody stated on a form and a level the club
      // checked are different claims, and only the second should carry
      // weight in BR8. This is where that stops being a comment: with
      // scope 39 a guardian can state one, and BR8 now refuses
      // designations rather than merely warning about them.
      classification:
        r.classifications
          .filter((c) => c.effectiveFrom <= fixture.playedOn && c.sightedAt !== null)
          .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]?.level ?? null,
      // What they claim, sighted or not — so the screen can say "unchecked"
      // rather than "none", which are different things to a coordinator.
      classificationClaimed:
        r.classifications
          .filter((c) => c.effectiveFrom <= fixture.playedOn)
          .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0]?.level ?? null,
      // Scope 38. Null until a club records a catalogued level against the
      // classification — every row written before 0032 has only the text,
      // and BR8 says plainly that it cannot compare it.
      classificationLevel: null,
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

export interface DeclaredAvailability {
  readonly windows: ReadonlyMap<string, readonly AvailabilityWindow[]>;
  readonly ranges: ReadonlyMap<string, readonly UnavailabilityRange[]>;
}

/**
 * What every official on the roster has declared for one season.
 *
 * Loaded for the whole club rather than per official, because the roster
 * screen shows them all and one round trip per referee would be a query
 * per row.
 *
 * **Unavailability is not season-scoped** — somebody away for three weeks
 * in January does not know which season the club considers that — so it is
 * read for the club and shown against whichever season is being edited.
 */
export async function loadDeclaredAvailability(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<DeclaredAvailability> {
  const [{ data: windowRows }, { data: rangeRows }] = await Promise.all([
    client
      .from('referee_availability')
      .select('id, person_id, weekday, from_time, to_time, note')
      .eq('club_id', clubId)
      .eq('season_id', seasonId),
    client
      .from('referee_unavailability')
      .select('id, person_id, starts_on, ends_on, reason')
      .eq('club_id', clubId),
  ]);

  const windows = new Map<string, AvailabilityWindow[]>();
  for (const row of (windowRows ?? []) as Record<string, string | number | null>[]) {
    const person = String(row.person_id);
    const list = windows.get(person) ?? [];
    list.push({
      id: String(row.id),
      weekday: Number(row.weekday),
      fromTime: row.from_time === null ? null : String(row.from_time),
      toTime: row.to_time === null ? null : String(row.to_time),
      note: row.note === null ? null : String(row.note),
    });
    windows.set(person, list);
  }

  const ranges = new Map<string, UnavailabilityRange[]>();
  for (const row of (rangeRows ?? []) as Record<string, string | null>[]) {
    const person = String(row.person_id);
    const list = ranges.get(person) ?? [];
    list.push({
      id: String(row.id),
      startsOn: String(row.starts_on),
      endsOn: String(row.ends_on),
      reason: row.reason === null ? null : String(row.reason),
    });
    ranges.set(person, list);
  }

  return { windows, ranges };
}

// ---------------------------------------------------- officiating interest

export interface OfficiatingInterestRow {
  readonly id: string;
  readonly personId: string;
  readonly personName: string;
  readonly wantsToOfficiate: boolean;
  readonly hasOfficiatedBefore: boolean;
  readonly declaredNumber: string | null;
  readonly declaredLevel: string | null;
  /** True where the declared level matched something catalogued (0032). */
  readonly levelIsCatalogued: boolean;
  readonly declaredAt: string;
  readonly declaredByName: string | null;
}

/**
 * Declarations waiting on a coordinator (BR136, scope 39).
 *
 * Pending only. A decided declaration is kept ([#79](../../docs/scope/open-questions.md))
 * but it is history, and a queue that shows history is a queue nobody
 * finishes.
 */
export async function loadPendingInterests(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly OfficiatingInterestRow[]> {
  const { data } = await client
    .from('officiating_interest')
    .select('id, person_id, wants_to_officiate, has_officiated_before, '
      + 'declared_accreditation_number, declared_level, declared_level_id, '
      + 'declared_at, declared_by_person_id')
    .eq('club_id', clubId)
    .eq('state', 'pending')
    .order('declared_at', { ascending: true });

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.flatMap((r) => [
    r.person_id as string,
    r.declared_by_person_id as string | null,
  ].filter((v): v is string => v !== null)))];

  const { data: people } = await client
    .from('person')
    .select('id, preferred_name, legal_given_names, legal_family_name')
    .eq('club_id', clubId)
    .in('id', ids);

  const names = new Map(((people ?? []) as unknown as Record<string, unknown>[]).map((p) => [
    p.id as string,
    `${(p.preferred_name as string | null)?.trim() || (p.legal_given_names as string)} ${p.legal_family_name as string}`,
  ]));

  return rows.map((r) => ({
    id: r.id as string,
    personId: r.person_id as string,
    personName: names.get(r.person_id as string) ?? 'Unknown',
    wantsToOfficiate: r.wants_to_officiate as boolean,
    hasOfficiatedBefore: r.has_officiated_before as boolean,
    declaredNumber: r.declared_accreditation_number as string | null,
    declaredLevel: r.declared_level as string | null,
    levelIsCatalogued: r.declared_level_id !== null,
    declaredAt: r.declared_at as string,
    declaredByName: r.declared_by_person_id === null
      ? null
      : names.get(r.declared_by_person_id as string) ?? null,
  }));
}

/**
 * The outcome, or an error.
 *
 * `accepted_without_role` is the interesting one: the decision was
 * recorded, and BR84 refused the season role because the person is an adult
 * with no verified Working with Children Check. Reported rather than
 * swallowed — a club that accepted somebody and must now chase a card is in
 * a better state than one whose accept silently did half of what it said.
 */
export type ReviewOutcome =
  | 'accepted' | 'accepted_without_role' | 'accepted_without_season' | 'declined';

export async function reviewInterest(
  client: SupabaseClient,
  interestId: string,
  accept: boolean,
  note: string | null,
): Promise<{ outcome: ReviewOutcome } | { error: string }> {
  const { data, error } = await client.rpc('app_review_interest', {
    p_interest_id: interestId,
    p_accept: accept,
    p_note: note,
  });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { outcome: (data as ReviewOutcome | null) ?? 'accepted' };
}
