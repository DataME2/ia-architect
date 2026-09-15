import type { SupabaseClient } from '@supabase/supabase-js';

import { isAdultOn, type OfferedDesignation } from '../web/designation-answer.ts';

/**
 * Designations, from the side of the person being asked (BR113).
 *
 * The coordinator's side has existed since C4. This is the half that was
 * owed to the family: migration 0045 admits a guardian to their own child's
 * appointments and lets them answer, so there is finally something for a
 * screen to read.
 *
 * **Every refusal still lives in the database.** Nothing here re-checks who
 * may answer — `app_may_answer_designation` settles it, and a second copy
 * of that decision in TypeScript would be the drift 0045's comment warns
 * about, on the side of the rule where drift means a child committed to a
 * Sunday morning by somebody with no authority over them.
 */

/** Who the club records as able to answer for this person, by name. */
export interface Answerer {
  readonly personId: string;
  readonly name: string;
}

export interface FamilyDesignations {
  readonly offered: readonly OfferedDesignation[];
  /**
   * The adults who may answer, **keyed by appointment**, not by official.
   * The screen shows one sentence per row and would otherwise have to
   * carry the official's person id through the pure layer purely to look
   * this up again.
   */
  readonly answerers: Readonly<Record<string, readonly string[]>>;
}

interface PersonRow {
  readonly id: string;
  readonly preferred_name: string | null;
  readonly legal_given_names: string;
  readonly legal_family_name: string;
  readonly date_of_birth: string | null;
}

function displayName(p: PersonRow): string {
  return `${p.preferred_name ?? p.legal_given_names} ${p.legal_family_name}`;
}

/**
 * Every designation belonging to this household, and who may answer each.
 *
 * `personIds` is the household as the caller already knows it. RLS would
 * narrow the query to the same set on its own — the filter is here so the
 * screen asks for what it means, not so it is safe; safety is 0045's
 * policy, and a screen that relied on its own filter for that would be one
 * forgotten `.eq()` from a leak.
 */
export async function loadFamilyDesignations(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
  today: string,
): Promise<FamilyDesignations> {
  if (personIds.length === 0) return { offered: [], answerers: {} };

  const { data: rows } = await client
    .from('match_official_appointment')
    .select('id, person_id, role, state, reason, fixture_id')
    .eq('club_id', clubId)
    .in('person_id', personIds);

  if (rows === null || rows.length === 0) return { offered: [], answerers: {} };

  const fixtureIds = [...new Set(rows.map((r) => r.fixture_id as string))];
  const [fixtures, people, guardians] = await Promise.all([
    client.from('fixture').select('id, opponent, played_on, kick_off')
      .eq('club_id', clubId).in('id', fixtureIds),
    client.from('person').select('id, preferred_name, legal_given_names, legal_family_name, date_of_birth')
      .eq('club_id', clubId).in('id', personIds),
    client.from('guardianship').select('person_id, guardian_person_id')
      .eq('club_id', clubId).in('person_id', personIds).eq('is_authority', true),
  ]);

  const fixtureById = new Map(
    (fixtures.data ?? []).map((f) => [f.id as string, f as { opponent: string; played_on: string; kick_off: string | null }]),
  );
  const personById = new Map((people.data ?? []).map((p) => [p.id as string, p as unknown as PersonRow]));

  // The guardians' own names come from a second read, because a guardian is
  // a Person at the club like any other and may well be outside `personIds`
  // — a household reads its children, not every adult on their record.
  const guardianIds = [...new Set((guardians.data ?? []).map((g) => g.guardian_person_id as string))];
  const guardianPeople = guardianIds.length === 0
    ? { data: [] }
    : await client.from('person').select('id, preferred_name, legal_given_names, legal_family_name, date_of_birth')
        .eq('club_id', clubId).in('id', guardianIds);
  const guardianById = new Map(
    (guardianPeople.data ?? []).map((p) => [p.id as string, p as unknown as PersonRow]),
  );

  const byOfficial: Record<string, string[]> = {};
  for (const g of guardians.data ?? []) {
    const person = guardianById.get(g.guardian_person_id as string);
    if (person === undefined) continue;
    (byOfficial[g.person_id as string] ??= []).push(displayName(person));
  }

  const answerers: Record<string, readonly string[]> = {};
  const offered: OfferedDesignation[] = [];
  for (const row of rows) {
    const fixture = fixtureById.get(row.fixture_id as string);
    const person = personById.get(row.person_id as string);
    if (fixture === undefined || person === undefined) continue;
    answerers[row.id as string] = byOfficial[row.person_id as string] ?? [];
    offered.push({
      id: row.id as string,
      officialName: displayName(person),
      // Measured today, not at the fixture — the same choice 0045 makes,
      // for the same reason: authority is about who may decide now.
      answeredByAnAdult: !isAdultOn(person.date_of_birth, today),
      opponent: fixture.opponent,
      playedOn: fixture.played_on,
      kickOff: fixture.kick_off,
      role: row.role as string,
      state: row.state as OfferedDesignation['state'],
      reason: (row.reason as string | null) ?? null,
    });
  }

  return { offered, answerers };
}

/**
 * Record an answer (BR113).
 *
 * `responderPersonId` is the signed-in person — their own Person at this
 * club, never chosen on the screen. The database checks it holds authority
 * and refuses otherwise, and the policy refuses an answer recorded in
 * somebody else's name, so what is passed here is a claim the row itself
 * has to survive rather than a permission granted by this function.
 */
export async function answerDesignation(
  client: SupabaseClient,
  clubId: string,
  appointmentId: string,
  responderPersonId: string,
  accept: boolean,
  reason: string | null,
): Promise<string | null> {
  const { error } = await client
    .from('match_official_appointment')
    .update({
      state: accept ? 'accepted' : 'declined',
      reason,
      responded_by_person_id: responderPersonId,
      responded_at: new Date().toISOString(),
    })
    .eq('club_id', clubId)
    .eq('id', appointmentId);

  // The trigger's messages name their rule and are written for a person.
  // Passing them through beats "something went wrong": a parent refused
  // because the club has no guardianship record for them needs to be told
  // that, since it is the club they then ring.
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

/**
 * Who the club records as able to answer for an official, for the
 * coordinator's side of the same rule.
 *
 * Reads through `app_may_answer_designation` rather than re-deriving it, so
 * the sentence the designation screen shows and the refusal the trigger
 * raises cannot come to disagree — which is the whole reason that function
 * exists rather than the trigger asking inline.
 *
 * `self` and an empty `guardians` are different answers and are kept apart:
 * an adult answering for themselves is ordinary, and a child with nobody
 * able to answer is a missing guardianship record the coordinator has to go
 * and fix.
 */
export async function answerersFor(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  asOf: string,
): Promise<{ readonly self: boolean; readonly guardians: readonly Answerer[] }> {
  const { data } = await client.rpc('app_may_answer_designation', {
    p_person_id: personId,
    p_club_id: clubId,
    p_as_of: asOf,
  });

  const all = ((data as readonly string[] | null) ?? []).map((id) => String(id));
  const self = all.includes(personId);
  const ids = all.filter((id) => id !== personId);
  if (ids.length === 0) return { self, guardians: [] };

  const { data: people } = await client
    .from('person')
    .select('id, preferred_name, legal_given_names, legal_family_name, date_of_birth')
    .eq('club_id', clubId)
    .in('id', ids);

  return {
    self,
    guardians: (people ?? []).map((p) => ({
      personId: p.id as string,
      name: displayName(p as unknown as PersonRow),
    })),
  };
}
