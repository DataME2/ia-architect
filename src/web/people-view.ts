/**
 * The people directory's decisions.
 *
 * Pure, like every other module here: no React, no I/O, no DOM. What this
 * file answers is "what does the registrar see, and in what order" — which
 * is a decision, and therefore testable without a browser or a database.
 *
 * The directory exists because P1 was true in the schema and invisible in
 * the product. A guardian created by a family's registration was reachable
 * only through the child they were attached to, and a Person who is a coach
 * and a parent looked like two unrelated rows. Listing people rather than
 * registrations is what makes "one Person, many roles" something a
 * registrar can see.
 */
import {
  ageAt,
  type Guardianship,
  type IsoDate,
  type Person,
  type PersonRole,
  type SeasonRole,
  SEASON_ROLES,
} from '../domain/types.ts';
import { displayNameFor, fullLegalName } from './queue-view.ts';

export const ROLE_LABEL: Readonly<Record<SeasonRole, string>> = {
  player: 'Player',
  referee: 'Referee',
  coach: 'Coach',
  guardian: 'Guardian',
  committee: 'Committee',
};

export interface PersonSummary {
  readonly personId: string;
  readonly displayName: string;
  readonly legalName: string;
  readonly dateOfBirth: IsoDate;
  readonly email: string | null;
  /** In the order of `SEASON_ROLES`, so the same person always reads the same. */
  readonly roles: readonly SeasonRole[];
  /** Names of the adults responsible for this person, for the row's subtitle. */
  readonly guardianNames: readonly string[];
  /** Names of the people this person is responsible for. */
  readonly dependantNames: readonly string[];
  readonly legalNameVerified: boolean;
  /**
   * `null` where the date of birth is a placeholder rather than a fact.
   *
   * A guardian created through the public form has no date of birth to
   * give, and the function records `1900-01-01`. Showing a registrar that
   * someone is 126 is worse than showing nothing, so the placeholder is
   * recognised here and reported as unknown.
   */
  readonly age: number | null;
}

/** The sentinel the public registration function writes for an unknown DOB. */
export const UNKNOWN_DATE_OF_BIRTH = '1900-01-01';

export function ageOf(person: Person, asAt: IsoDate): number | null {
  return person.dateOfBirth === UNKNOWN_DATE_OF_BIRTH
    ? null
    : ageAt(person.dateOfBirth, asAt);
}

function orderRoles(roles: Iterable<SeasonRole>): readonly SeasonRole[] {
  const held = new Set(roles);
  return SEASON_ROLES.filter((role) => held.has(role));
}

/**
 * Family name, then given names, then date of birth.
 *
 * Family name first because that is how a registrar holds a list of people,
 * and because it is what a federation's rejection notice leads with. Date of
 * birth is the third key rather than an unread tiebreak: two children with
 * the same name in one club is exactly what BR5 flags, and standing them
 * next to each other is how a registrar notices.
 */
function sortKey(person: Person): readonly [string, string, string] {
  return [
    person.legalName.familyName.toLowerCase(),
    person.legalName.givenNames.toLowerCase(),
    person.dateOfBirth,
  ];
}

function compareKeys(
  a: readonly [string, string, string],
  b: readonly [string, string, string],
): number {
  return (
    a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2])
  );
}

export function buildDirectory(
  people: readonly Person[],
  roles: readonly PersonRole[],
  guardianships: readonly Guardianship[],
  asAt: IsoDate,
): readonly PersonSummary[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const name = (id: string): string | null => {
    const person = byId.get(id);
    return person === undefined ? null : displayNameFor(person);
  };

  const rolesByPerson = new Map<string, Set<SeasonRole>>();
  for (const role of roles) {
    const held = rolesByPerson.get(role.personId) ?? new Set<SeasonRole>();
    held.add(role.role);
    rolesByPerson.set(role.personId, held);
  }

  return people
    .map((person) => ({
      key: sortKey(person),
      personId: person.id,
      displayName: displayNameFor(person),
      legalName: fullLegalName(person),
      dateOfBirth: person.dateOfBirth,
      email: person.email,
      roles: orderRoles(rolesByPerson.get(person.id) ?? []),
      guardianNames: guardianships
        .filter((g) => g.personId === person.id)
        .map((g) => name(g.guardianPersonId))
        .filter((n): n is string => n !== null),
      dependantNames: guardianships
        .filter((g) => g.guardianPersonId === person.id)
        .map((g) => name(g.personId))
        .filter((n): n is string => n !== null),
      legalNameVerified: person.legalNameVerifiedAt !== null,
      age: ageOf(person, asAt),
    }))
    .sort((a, b) => compareKeys(a.key, b.key))
    .map(({ key: _key, ...summary }) => summary);
}

/**
 * Substring search over name and email.
 *
 * Matches the legal name as well as the displayed one: a registrar looking
 * for the child the federation rejected is holding the legal name, which
 * may be the one name not on the screen (BR55).
 */
export function searchDirectory(
  summaries: readonly PersonSummary[],
  query: string,
): readonly PersonSummary[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return summaries;
  return summaries.filter(
    (s) =>
      s.displayName.toLowerCase().includes(needle) ||
      s.legalName.toLowerCase().includes(needle) ||
      (s.email !== null && s.email.toLowerCase().includes(needle)),
  );
}

/** How many people hold each role, for the directory's summary line. */
export function roleCounts(
  summaries: readonly PersonSummary[],
): ReadonlyMap<SeasonRole, number> {
  const counts = new Map<SeasonRole, number>(SEASON_ROLES.map((r) => [r, 0]));
  for (const summary of summaries) {
    for (const role of summary.roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return counts;
}

/**
 * People holding no role in the selected season.
 *
 * Worth its own question rather than a filter option: a Person with no role
 * is either last season's player who has not come back, or a record created
 * by mistake. Both are things a registrar should be shown, and neither is
 * visible from a list of registrations.
 */
export function withoutRole(
  summaries: readonly PersonSummary[],
): readonly PersonSummary[] {
  return summaries.filter((s) => s.roles.length === 0);
}

/**
 * A role name from a form, or `null`.
 *
 * A posted role is an assertion by whoever is on the other end of the form,
 * not a fact, and the database's check constraint would reject an unknown
 * one as a 500. Narrowing here turns that into a message.
 */
export function parseSeasonRole(value: unknown): SeasonRole | null {
  return typeof value === 'string' && (SEASON_ROLES as readonly string[]).includes(value)
    ? (value as SeasonRole)
    : null;
}

/**
 * The document checklist a registrar typed, one per line.
 *
 * Trimmed, de-duplicated case-insensitively, and order-preserving. Blank
 * lines vanish rather than becoming a requirement nobody can ever satisfy —
 * BR2 names the missing types back to a family, and `Still needed: .` is
 * not a sentence anyone can act on.
 */
export function parseDocumentChecklist(input: string): readonly string[] {
  const seen = new Set<string>();
  const types: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    const value = line.trim().replace(/\s+/g, ' ');
    if (value === '') continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    types.push(value);
  }
  return types;
}
