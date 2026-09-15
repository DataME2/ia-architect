/**
 * What the "answer a designation" screens decide, as pure functions.
 *
 * BR113: a designation for a match official under 18 is proposed to their
 * Parent/Guardian, who accepts or declines it. The database settles who may
 * answer (migration 0045, `app_may_answer_designation`) and refuses anybody
 * else. What is left for a screen is the part a trigger cannot do: say to
 * whom the question has gone, and refuse to submit a decline with no reason
 * rather than letting BR42's constraint be the first thing a parent hears.
 *
 * **Age is taken as an argument, never read from a clock.** Whether
 * somebody is a child is the whole of this rule, and a function that
 * reached for `new Date()` would answer a different question each time it
 * ran and could not be tested at all.
 */

/** A designation, as a family is shown it. */
export interface OfferedDesignation {
  readonly id: string;
  readonly officialName: string;
  /** True when the official is under 18 and an adult must answer for them. */
  readonly answeredByAnAdult: boolean;
  readonly opponent: string;
  /** ISO date of the fixture. */
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly role: string;
  readonly state: 'proposed' | 'accepted' | 'declined' | 'withdrawn';
  readonly reason: string | null;
}

const ROLE_LABEL: Readonly<Record<string, string>> = {
  referee: 'Referee',
  assistant_referee: 'Assistant referee',
  fourth_official: 'Fourth official',
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/**
 * Whether this person had turned 18 on a date.
 *
 * The same arithmetic as the database's `app_is_adult_on`, and it has to
 * be: a screen that thought a seventeen-year-old was an adult would show
 * them a question the database will then refuse to take from them. Both
 * compare against the date the answer is being given rather than the date
 * of the fixture — authority is about who may decide *now*, which is the
 * opposite of how BR111 measures a card, and deliberately so.
 */
export function isAdultOn(dateOfBirth: string | null, asOf: string): boolean {
  if (dateOfBirth === null || dateOfBirth === '') return false; // unknown: ask an adult
  const parts = dateOfBirth.split('-');
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number) as [number, number, number];
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  // Compared as an ISO string rather than through Date: the eighteenth
  // birthday of somebody born on 29 February is 29 February, which no
  // calendar has in 2026, and a Date would roll it forward to 1 March.
  // Comparing '2026-02-29' <= '2026-02-28' gives the same answer without
  // needing the date to exist.
  const eighteenth = `${String(y + 18).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return eighteenth <= asOf;
}

/**
 * The sentence naming who the question has gone to.
 *
 * A proposal the family cannot see the shape of is not much of a proposal,
 * and "awaiting a response" tells a coordinator nothing about whether they
 * should be chasing the referee or the referee's mother.
 */
export function proposedTo(
  official: string,
  guardians: readonly string[],
  answeredByAnAdult: boolean,
): string {
  if (!answeredByAnAdult) return `${official} answers for themselves.`;
  if (guardians.length === 0) {
    return `${official} is under 18 and no Parent/Guardian holding authority is recorded — nobody can answer this (BR113).`;
  }
  return `Proposed to ${joinNames(guardians)}, who answers for ${official} (BR113).`;
}

function joinNames(names: readonly string[]): string {
  if (names.length === 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export type ParsedAnswer =
  | { readonly ok: true; readonly id: string; readonly accept: boolean; readonly reason: string | null }
  | { readonly ok: false; readonly message: string };

/**
 * A family's answer, read off the form.
 *
 * BR42 and BR112: a decline carries its reason, and is not recorded at all
 * without one. The database refuses it too — this is the copy of the rule
 * that exists so a parent is told before they lose what they typed, not
 * instead of the one that is enforced.
 */
export function parseAnswer(fields: {
  readonly id?: string | null;
  readonly answer?: string | null;
  readonly reason?: string | null;
}): ParsedAnswer {
  const id = (fields.id ?? '').trim();
  if (id === '') return { ok: false, message: 'Nothing to answer.' };

  const answer = (fields.answer ?? '').trim();
  if (answer !== 'accept' && answer !== 'decline') {
    return { ok: false, message: 'Accept or decline it.' };
  }

  const reason = (fields.reason ?? '').trim();
  if (answer === 'decline' && reason === '') {
    return { ok: false, message: 'A decline carries a brief reason (BR42) — a sentence is enough.' };
  }

  return { ok: true, id, accept: answer === 'accept', reason: reason === '' ? null : reason };
}

/**
 * The designations still waiting on an answer, soonest fixture first.
 *
 * Only `proposed`: an accepted one needs nothing, and a withdrawn one is
 * the club's decision, not a question. A family shown four rows of which
 * one is answerable answers none of them.
 */
export function awaitingAnswer(
  offered: readonly OfferedDesignation[],
): readonly OfferedDesignation[] {
  return offered
    .filter((o) => o.state === 'proposed')
    .slice()
    .sort((a, b) =>
      a.playedOn === b.playedOn
        ? (a.kickOff ?? '').localeCompare(b.kickOff ?? '')
        : a.playedOn.localeCompare(b.playedOn),
    );
}
