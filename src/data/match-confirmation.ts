/**
 * A guardian confirming a MiniRef's match happened (BR151, scope 66).
 *
 * `designations.ts`'s shape: nothing here re-checks who may confirm or
 * whether the official was under thirteen on the day — migration 0055's
 * trigger settles both, and a second copy of that decision here is the
 * drift 0045's own comment warns against.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { wasUnderThirteenOn } from '../web/match-confirmation-view.ts';
import { QueryError } from './queries.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface ConfirmableAppointment {
  readonly fixtureId: string;
  readonly personId: string;
  readonly officialName: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly confirmed: boolean;
}

/**
 * Every past, accepted appointment for this household's under-13 officials
 * that BR151 offers a confirmation for, and whether one has been given.
 */
export async function loadConfirmableAppointments(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
  today: string,
): Promise<readonly ConfirmableAppointment[]> {
  if (personIds.length === 0) return [];

  const { data: appointments } = await client
    .from('match_official_appointment')
    .select('fixture_id, person_id, state')
    .eq('club_id', clubId)
    .in('person_id', personIds)
    .eq('state', 'accepted');
  const rows = (appointments ?? []) as { fixture_id: string; person_id: string }[];
  if (rows.length === 0) return [];

  const fixtureIds = [...new Set(rows.map((r) => r.fixture_id))];
  const [{ data: fixtures }, { data: people }, { data: confirmations }] = await Promise.all([
    client.from('fixture').select('id, opponent, played_on').eq('club_id', clubId).in('id', fixtureIds),
    client
      .from('person')
      .select('id, preferred_name, legal_given_names, legal_family_name, date_of_birth')
      .eq('club_id', clubId)
      .in('id', personIds),
    client
      .from('referee_match_confirmation')
      .select('fixture_id, person_id')
      .eq('club_id', clubId)
      .in('fixture_id', fixtureIds)
      .in('person_id', personIds),
  ]);

  const fixtureById = new Map(
    (fixtures ?? []).map((f) => [f.id as string, f as { opponent: string; played_on: string }]),
  );
  const personById = new Map(
    (people ?? []).map((p) => [
      p.id as string,
      p as { preferred_name: string | null; legal_given_names: string; legal_family_name: string; date_of_birth: string },
    ]),
  );
  const confirmedKeys = new Set(
    (confirmations ?? []).map((c) => `${c.fixture_id as string}:${c.person_id as string}`),
  );

  const out: ConfirmableAppointment[] = [];
  for (const row of rows) {
    const fixture = fixtureById.get(row.fixture_id);
    const person = personById.get(row.person_id);
    if (fixture === undefined || person === undefined) continue;
    // Only past fixtures, and only where BR151's own gate would accept the
    // row — a screen offering a confirmation the trigger would refuse is
    // worse than not offering it.
    if (fixture.played_on > today) continue;
    if (!wasUnderThirteenOn(person.date_of_birth, fixture.played_on)) continue;

    out.push({
      fixtureId: row.fixture_id,
      personId: row.person_id,
      officialName: `${person.preferred_name ?? person.legal_given_names} ${person.legal_family_name}`,
      opponent: fixture.opponent,
      playedOn: fixture.played_on,
      confirmed: confirmedKeys.has(`${row.fixture_id}:${row.person_id}`),
    });
  }
  return out.sort((a, b) => (a.playedOn < b.playedOn ? 1 : -1));
}

/**
 * Record a confirmation. `confirmedByPersonId` is the signed-in person's
 * own Person at this club, never chosen on the screen — the database
 * checks it holds authority for the official and refuses otherwise.
 *
 * `goalsFor`/`goalsAgainst` are the club's own goals either way — never
 * "home"/"away", which name a different side of the ground depending on
 * `fixture.home_away`. Migration 0056's trigger copies whichever of these
 * is given into `fixture.goals_for`/`goals_against` when that field is
 * still empty, and marks the fixture played.
 */
export async function recordMatchConfirmation(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
  personId: string,
  confirmedByPersonId: string,
  goalsFor: number | null,
  goalsAgainst: number | null,
): Promise<string | null> {
  const { error } = await client.from('referee_match_confirmation').insert({
    club_id: clubId,
    fixture_id: fixtureId,
    person_id: personId,
    confirmed_by_person_id: confirmedByPersonId,
    goals_for: goalsFor,
    goals_against: goalsAgainst,
  });
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}
