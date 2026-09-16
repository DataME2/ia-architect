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
 * A search box's text as a safe `ILIKE` pattern — escaped, wrapped in `%`,
 * or `null` for nothing typed.
 *
 * Two separate concerns, both real. **`%` and `_` are `ILIKE` wildcards**:
 * without escaping, searching for "50%" would match anything, not the
 * literal text a registrar typed. **`,`, `(`, `)`, and `"` break the
 * `.or()` filter string** the data layer builds this into — PostgREST reads
 * commas as separating one condition from the next, so an unescaped one
 * would silently turn "Smith, John" into two conditions, or fail the
 * request outright. Those four are stripped rather than escaped: a name
 * containing one is vanishingly rare, and dropping the character still
 * finds the record on everything either side of it — a broken search would
 * not.
 */
export function ilikePattern(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed === '') return null;
  const escaped = trimmed
    .replace(/[,()"]/g, '')
    .replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}

export interface RoleSummary {
  readonly total: number;
  readonly byRole: ReadonlyMap<SeasonRole, number>;
  /**
   * Holding no role this season — either last season's player who has not
   * come back, or a record created by mistake. Both are things a registrar
   * should be able to find, and neither is visible from a list of
   * registrations.
   */
  readonly unrostered: number;
}

/**
 * The directory's summary line, computed from role rows alone rather than
 * from a built directory — the count a registrar wants does not need every
 * Person's name, email and guardians fetched first just to be discarded.
 */
export function summariseRoles(
  totalPeople: number,
  roles: readonly PersonRole[],
): RoleSummary {
  const byRole = new Map<SeasonRole, number>(SEASON_ROLES.map((r) => [r, 0]));
  const rostered = new Set<string>();
  for (const role of roles) {
    byRole.set(role.role, (byRole.get(role.role) ?? 0) + 1);
    rostered.add(role.personId);
  }
  return { total: totalPeople, byRole, unrostered: Math.max(0, totalPeople - rostered.size) };
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

/** The sentinel the "no role" filter option posts — not a `SeasonRole`. */
export const UNROSTERED = 'unrostered';

/** A role filter from a form: a real season role, `UNROSTERED`, or `null` for "every role". */
export function parseRoleFilter(value: unknown): SeasonRole | typeof UNROSTERED | null {
  if (value === UNROSTERED) return UNROSTERED;
  return parseSeasonRole(value);
}

export const PAGE_SIZE = 50;

export interface PageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

/**
 * A page number from a query string, or `1`.
 *
 * A page is a person's own bookmark, not a fact the server can trust: a
 * stale link, a hand-edited URL, or `?page=-4` all arrive as `unknown`
 * here, and the honest response to any of them is the first page rather
 * than an empty query or a crash.
 */
export function parsePage(value: unknown): number {
  // `Number(...)`, not `parseInt`: parseInt truncates "2.5" to 2 instead of
  // rejecting it, which would make an off-by-a-fraction URL look valid.
  const n = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** How many pages a count divides into, at least one even when the count is zero. */
export function pageCount(totalCount: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

/** A requested page, pulled back inside `[1, pageCount]` rather than showing nothing. */
export function clampPage(page: number, totalCount: number, pageSize: number = PAGE_SIZE): number {
  return Math.min(Math.max(1, page), pageCount(totalCount, pageSize));
}

/** The `from`/`to` pair `.range()` wants, zero-indexed and inclusive on both ends. */
export function rangeFor(page: number, pageSize: number = PAGE_SIZE): { readonly from: number; readonly to: number } {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
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
