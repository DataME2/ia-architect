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

function sameLegalName(a: Person, b: Person): boolean {
  return (
    normalise(a.legalName.givenNames) === normalise(b.legalName.givenNames) &&
    normalise(a.legalName.familyName) === normalise(b.legalName.familyName)
  );
}

function sameEmail(a: Person, b: Person): boolean {
  return a.email !== null && b.email !== null && normalise(a.email) === normalise(b.email);
}

function emailsDisagree(a: Person, b: Person): boolean {
  return a.email !== null && b.email !== null && normalise(a.email) !== normalise(b.email);
}

/**
 * Candidates for `person` among `others`.
 *
 * `others` must already be tenant-scoped — at the point this is called
 * Row-Level Security has done that, and re-filtering here would imply the
 * caller might legitimately hold another club's rows.
 */
export function findDuplicateCandidates(
  person: Person,
  others: readonly Person[],
): readonly DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const other of others) {
    if (other.id === person.id) continue;

    // A shared email settles it whatever the names say — but the date of
    // birth must agree too. Siblings are routinely registered under one
    // family address, and matching on the address alone would declare two
    // children to be one child.
    if (sameEmail(person, other) && other.dateOfBirth === person.dateOfBirth) {
      candidates.push({
        personId: person.id,
        otherPersonId: other.id,
        basis: 'email-and-dob',
        confidence: 'confirmed',
        evidence: `Same email address (${person.email}) and date of birth. ${
          sameLegalName(person, other)
            ? 'The names match too.'
            : 'The names differ — people abbreviate, marry, and mistype.'
        }`,
      });
      continue;
    }

    // Name and date of birth agreeing is a strong hint and nothing more.
    // Two different emails mean two different humans, so the club is *not*
    // asked about them.
    if (sameLegalName(person, other) && other.dateOfBirth === person.dateOfBirth) {
      if (emailsDisagree(person, other)) continue;

      candidates.push({
        personId: person.id,
        otherPersonId: other.id,
        basis: 'legal-name-and-dob',
        confidence: 'possible',
        evidence: `Same legal name and date of birth (${person.dateOfBirth}), and no email on ${
          person.email === null && other.email === null ? 'either record' : 'one of them'
        } to tell them apart.`,
      });
    }
  }

  return candidates;
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

  for (const person of people) {
    for (const candidate of findDuplicateCandidates(person, people)) {
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
