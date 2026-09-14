/**
 * BR5 — two Person records that look like one human are flagged for a
 * person to decide, never silently merged.
 *
 * There is no shared external identifier to match on — SQUADI dropped the FA
 * ID in March 2025 and it has not returned (BR44, question #34) — so matching
 * falls back to name, date of birth, and email. An automatic merge attaches
 * one child's registration, payments, and eligibility to a different child.
 *
 * **Email is the decider, in both directions** (restated August 2026, on the
 * club's rule).
 *
 * Forwards: a shared email *and* date of birth is the same human even where
 * the names disagree — people abbreviate, marry, and mistype, and the four
 * variations of one parent this club accumulated shared nothing but an
 * address. The date of birth has to agree as well, and that is not
 * pedantry: siblings are routinely registered under one family email, and
 * matching on the address alone would declare two children to be one.
 *
 * Backwards, and this is the part that was missing: two records with the
 * *same* name and *different* emails are two different humans. They are no
 * longer raised at all. A club really does have two families called Nguyen,
 * and asking a registrar about them spends the one thing they have least
 * of.
 */
import type { Person } from '../types.ts';

export type MatchBasis = 'email-and-dob' | 'legal-name-and-dob';

/** How sure the system is, which decides how the screen presents it. */
export type MatchConfidence = 'confirmed' | 'possible';

export interface DuplicateCandidate {
  readonly personId: string;
  readonly otherPersonId: string;
  readonly basis: MatchBasis;
  readonly confidence: MatchConfidence;
  /** Why a human should look, in words they can act on. */
  readonly evidence: string;
}

const normalise = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A person with their comparison keys computed once.
 *
 * `normalise` allocates a string and runs a regex, and the comparison below
 * is quadratic in the number of people — so normalising inside the loop
 * normalises the same name once per other person in the club. At a
 * seven-hundred-registration club that was several million allocations to
 * answer a question about a few hundred distinct names.
 */
interface Keyed {
  readonly person: Person;
  readonly given: string;
  readonly family: string;
  /** `null` where the record carries no email — which is a *third* state. */
  readonly email: string | null;
}

function keyed(person: Person): Keyed {
  return {
    person,
    given: normalise(person.legalName.givenNames),
    family: normalise(person.legalName.familyName),
    email: person.email === null ? null : normalise(person.email),
  };
}

function sameLegalName(a: Keyed, b: Keyed): boolean {
  return a.given === b.given && a.family === b.family;
}

function sameEmail(a: Keyed, b: Keyed): boolean {
  return a.email !== null && b.email !== null && a.email === b.email;
}

function emailsDisagree(a: Keyed, b: Keyed): boolean {
  return a.email !== null && b.email !== null && a.email !== b.email;
}

/**
 * People grouped by date of birth.
 *
 * **Every basis above requires the dates of birth to agree** — a shared
 * email is only a match when the birthday matches too (siblings on one
 * family address), and a shared name likewise. So two people born on
 * different days can never be candidates, and comparing them is work with a
 * known answer.
 *
 * That makes the grouping **exact rather than a heuristic**: it is not a
 * cheap pre-filter that might drop a real match, it is the matching rule
 * read as an index. Nothing here decides anything the comparison below
 * would not have decided.
 */
export interface DuplicateIndex {
  readonly byDateOfBirth: ReadonlyMap<string, readonly Keyed[]>;
}

/**
 * Builds the index once, for a caller that will ask about many people.
 *
 * A screen asking about one person does not need this — `others` has to be
 * walked at least once either way. It is the *pack* and the *queue* that
 * need it: both ask the same question of every registration in the season,
 * and both were re-deriving the whole club's keys each time.
 */
export function buildDuplicateIndex(people: readonly Person[]): DuplicateIndex {
  const byDateOfBirth = new Map<string, Keyed[]>();
  for (const person of people) {
    const bucket = byDateOfBirth.get(person.dateOfBirth);
    if (bucket === undefined) byDateOfBirth.set(person.dateOfBirth, [keyed(person)]);
    else bucket.push(keyed(person));
  }
  return { byDateOfBirth };
}

/**
 * Candidates for one person, against a prepared index.
 *
 * Only the bucket for this person's own date of birth is walked, because no
 * other bucket can contain a match — see `buildDuplicateIndex`.
 */
export function candidatesFromIndex(
  index: DuplicateIndex,
  person: Person,
): readonly DuplicateCandidate[] {
  const bucket = index.byDateOfBirth.get(person.dateOfBirth);
  if (bucket === undefined) return [];

  const subject = keyed(person);
  const candidates: DuplicateCandidate[] = [];

  for (const other of bucket) {
    if (other.person.id === person.id) continue;

    // A shared email settles it whatever the names say — but the date of
    // birth must agree too, which being in this bucket is what establishes.
    // Siblings are routinely registered under one family address, and
    // matching on the address alone would declare two children to be one.
    if (sameEmail(subject, other)) {
      candidates.push({
        personId: person.id,
        otherPersonId: other.person.id,
        basis: 'email-and-dob',
        confidence: 'confirmed',
        evidence: `Same email address (${person.email}) and date of birth. ${
          sameLegalName(subject, other)
            ? 'The names match too.'
            : 'The names differ — people abbreviate, marry, and mistype.'
        }`,
      });
      continue;
    }

    // Name and date of birth agreeing is a strong hint and nothing more.
    // Two different emails mean two different humans, so the club is *not*
    // asked about them.
    if (sameLegalName(subject, other)) {
      if (emailsDisagree(subject, other)) continue;

      candidates.push({
        personId: person.id,
        otherPersonId: other.person.id,
        basis: 'legal-name-and-dob',
        confidence: 'possible',
        evidence: `Same legal name and date of birth (${person.dateOfBirth}), and no email on ${
          person.email === null && other.person.email === null ? 'either record' : 'one of them'
        } to tell them apart.`,
      });
    }
  }

  return candidates;
}

/**
 * Candidates for `person` among `others`.
 *
 * `others` must already be tenant-scoped — at the point this is called
 * Row-Level Security has done that, and re-filtering here would imply the
 * caller might legitimately hold another club's rows.
 *
 * For a single question this is the whole cost either way. A caller asking
 * about every registration in a season should build the index once and use
 * `candidatesFromIndex` instead, or it rebuilds the club on every row.
 */
export function findDuplicateCandidates(
  person: Person,
  others: readonly Person[],
): readonly DuplicateCandidate[] {
  return candidatesFromIndex(buildDuplicateIndex(others), person);
}

/** A pair, with the lower id first, so a pair is counted once not twice. */
export interface DuplicatePair {
  readonly aId: string;
  readonly bId: string;
  readonly basis: MatchBasis;
  readonly confidence: MatchConfidence;
  readonly evidence: string;
}

/**
 * Every duplicate pair in a club, each listed once.
 *
 * The per-registration view cannot find these. A guardian has no
 * registration of their own, so the four copies of one parent this club
 * accumulated appeared on no screen at all — which is how they got to four.
 */
export function findDuplicatePairs(people: readonly Person[]): readonly DuplicatePair[] {
  const seen = new Set<string>();
  const pairs: DuplicatePair[] = [];

  const index = buildDuplicateIndex(people);

  for (const person of people) {
    for (const candidate of candidatesFromIndex(index, person)) {
      const [aId, bId] =
        person.id < candidate.otherPersonId
          ? [person.id, candidate.otherPersonId]
          : [candidate.otherPersonId, person.id];

      const key = `${aId}:${bId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        aId,
        bId,
        basis: candidate.basis,
        confidence: candidate.confidence,
        evidence: candidate.evidence,
      });
    }
  }

  // Confirmed first: those are decisions a registrar can make quickly, and
  // clearing them shrinks the pile of maybes.
  return pairs.sort((a, b) =>
    a.confidence === b.confidence ? 0 : a.confidence === 'confirmed' ? -1 : 1,
  );
}
