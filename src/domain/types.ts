/**
 * Domain types for the registration slice.
 *
 * Realises the data objects in `docs/ea/3_information/1_data-objects.md`.
 * No I/O, no framework, no database — see the structural rules in
 * `docs/ea/4_application/2_application-components.md`.
 */

/** ISO-8601 date, `YYYY-MM-DD`. */
export type IsoDate = string;
/** ISO-8601 instant. */
export type IsoInstant = string;

/**
 * A name as it appears on a passport or birth certificate (BR55).
 *
 * Modelled as an object rather than a string so it cannot be passed where a
 * preferred name is expected, or vice versa. The two are different things
 * with different jobs — the legal name goes to the governing body, the
 * preferred name goes to humans — and conflating them is the confirmed
 * dominant cause of registration delay.
 */
export interface LegalName {
  readonly givenNames: string;
  readonly familyName: string;
}

export interface Person {
  readonly id: string;
  /** The tenant. Every row carries it; RLS enforces it (P5). */
  readonly clubId: string;
  readonly legalName: LegalName;
  /**
   * When the legal name was checked against an identity document, or `null`
   * if it never has been. BR55 needs this to be enforceable rather than
   * aspirational: "we hold a legal name" and "we checked it" are different
   * claims, and only the second survives contact with the federation.
   */
  readonly legalNameVerifiedAt: IsoInstant | null;
  /** What the person is actually called. Never submitted externally. */
  readonly preferredName: string | null;
  readonly dateOfBirth: IsoDate;
  readonly email: string | null;
  /**
   * Identification photograph in Storage (BR56), or `null`.
   *
   * Holding it is not permission to send it: onward disclosure needs a live
   * IDENTIFICATION_PHOTOGRAPH consent naming that disclosure, which the pack
   * builder checks rather than assuming.
   */
  readonly photoPath: string | null;
}

/**
 * Links a Person to a responsible adult.
 *
 * Two independent flags, because BR67 separates them: authority ends at 18,
 * contactability need not. A single "is guardian" boolean cannot express a
 * parent who no longer consents for their 19-year-old but is still who the
 * club phones.
 */
export interface Guardianship {
  readonly personId: string;
  readonly guardianPersonId: string;
  /** May give consent and exercise rights on the Person's behalf (BR48). */
  readonly isAuthority: boolean;
  /** Reachable about the Person (BR67). */
  readonly isContact: boolean;
}

/**
 * The roles a Person can hold in a season (P1).
 *
 * One list, in the domain, because P1 is a domain statement: a player,
 * referee, coach, guardian and committee member are *roles a Person holds*,
 * not five kinds of record. The database's check constraint and this array
 * are the same list said twice, and they are meant to be diffed.
 */
export const SEASON_ROLES = ['player', 'referee', 'coach', 'guardian', 'committee'] as const;

export type SeasonRole = (typeof SEASON_ROLES)[number];

/** One role held by one Person for one season. */
export interface PersonRole {
  readonly personId: string;
  readonly seasonId: string;
  readonly role: SeasonRole;
}

export const CONSENT_PURPOSES = [
  'REGISTRATION_COLLECTION_NOTICE',
  'IDENTIFICATION_PHOTOGRAPH',
  'PUBLICITY',
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

/**
 * One consent, for one purpose (BR48).
 *
 * Deliberately a record rather than a boolean column: three purposes with
 * independent grant, revocation, and authority are three lifecycles, and a
 * flag cannot say who granted it or when it was withdrawn.
 */
export interface Consent {
  readonly personId: string;
  readonly purpose: ConsentPurpose;
  /** The Person themselves, or a Guardian holding authority. */
  readonly grantedByPersonId: string;
  readonly grantedAt: IsoInstant;
  readonly revokedAt: IsoInstant | null;
}

export const REGISTRATION_STATUSES = [
  'DRAFT',
  'PENDING_DOCUMENTS',
  'PENDING_PAYMENT',
  /** An eligibility gate on taking the field, not paperwork (BR43). */
  'PENDING_EXTERNAL_REGISTRATION',
  'COMPLETE',
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export interface Registration {
  readonly id: string;
  readonly clubId: string;
  readonly seasonId: string;
  readonly personId: string;
  readonly status: RegistrationStatus;
  readonly requiredDocumentTypes: readonly string[];
  readonly providedDocumentTypes: readonly string[];
  /** Cents, to avoid float money. Zero means nothing outstanding. */
  readonly outstandingAmountCents: number;
}

/** Age in whole years at `asAt`. */
export function ageAt(dateOfBirth: IsoDate, asAt: IsoDate): number {
  const [by, bm, bd] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const [ay, am, ad] = asAt.split('-').map(Number) as [number, number, number];
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age -= 1;
  return age;
}

/**
 * Under 18 at `asAt`.
 *
 * This is the general legal-minority threshold used by BR1, BR48 and BR67.
 * It is *not* FIFA's "Minor (ITC)" definition of 10–17 (BR37), which is
 * narrower and applies only to international clearance.
 */
export function isMinor(person: Person, asAt: IsoDate): boolean {
  return ageAt(person.dateOfBirth, asAt) < 18;
}
