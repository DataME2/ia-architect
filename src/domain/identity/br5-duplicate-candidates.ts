/**
 * BR5 — two Person records with matching strong identifiers are flagged as a
 * possible duplicate, never silently merged.
 *
 * Separate from the registration rules because the signature differs: this
 * one asks a question about a *set* of people, not about one registration.
 *
 * There is no shared external identifier to match on — SQUADI dropped the FA
 * ID in March 2025 and it has not returned (BR44, question #34) — so matching
 * falls back to name, date of birth, and email. Every result is a candidate
 * for a human to confirm. An automatic merge here attaches one child's
 * registration, payments, and eligibility to a different child.
 */
import type { Person } from '../types.ts';

export type MatchBasis = 'legal-name-and-dob' | 'email-and-dob';

export interface DuplicateCandidate {
  readonly personId: string;
  readonly otherPersonId: string;
  readonly basis: MatchBasis;
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

/**
 * Candidates for `person` among `others`.
 *
 * `others` must already be tenant-scoped — this function does not filter by
 * club, because at the point it is called Row-Level Security has done that,
 * and re-filtering here would imply the caller might legitimately hold
 * another club's rows.
 */
export function findDuplicateCandidates(
  person: Person,
  others: readonly Person[],
): readonly DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  for (const other of others) {
    if (other.id === person.id) continue;
    if (other.dateOfBirth !== person.dateOfBirth) continue;

    if (sameLegalName(person, other)) {
      candidates.push({
        personId: person.id,
        otherPersonId: other.id,
        basis: 'legal-name-and-dob',
        evidence: `Same legal name and date of birth (${person.dateOfBirth}).`,
      });
      continue;
    }
    if (
      person.email !== null &&
      other.email !== null &&
      normalise(person.email) === normalise(other.email)
    ) {
      candidates.push({
        personId: person.id,
        otherPersonId: other.id,
        basis: 'email-and-dob',
        evidence: `Same email address and date of birth (${person.dateOfBirth}).`,
      });
    }
  }
  return candidates;
}
