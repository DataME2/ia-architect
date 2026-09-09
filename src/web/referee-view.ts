/**
 * What the referee screens decide, as pure functions.
 *
 * The rules these serve — BR8, BR10, BR110, BR111 — are all questions about
 * a *date*: what was this official classified as when that match was
 * played, and was their accreditation valid then. So every function here
 * takes the date it is asked about rather than reaching for today. A
 * function that used `new Date()` internally would be untestable and would
 * quietly answer a different question each time it ran.
 */

/** One row of the classification history (BR110). */
export interface ClassificationRecord {
  readonly level: string;
  /** ISO date the level took effect. */
  readonly effectiveFrom: string;
  /** When the club checked it against the register, or null if nobody did. */
  readonly sightedAt: string | null;
}

export interface Accreditation {
  readonly kind: string;
  readonly identifier: string | null;
  readonly issuedOn: string | null;
  readonly expiresOn: string | null;
  readonly verifiedAt: string | null;
}

export interface RefereeSummary {
  readonly personId: string;
  readonly name: string;
  readonly officialNumber: string | null;
  readonly startedOn: string | null;
  readonly retiredOn: string | null;
  readonly classifications: readonly ClassificationRecord[];
  readonly accreditations: readonly Accreditation[];
}

/**
 * What this official was classified as on a date — the latest record that
 * had taken effect by then, or null.
 *
 * **Null is the honest answer before the first record**, not the earliest
 * level. Falling back to the earliest would invent a qualification the club
 * never recorded, on exactly the dates where the club has least evidence.
 */
export function classificationOn(
  history: readonly ClassificationRecord[],
  asOf: string,
): ClassificationRecord | null {
  const effective = history
    .filter((c) => c.effectiveFrom <= asOf)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  return effective[0] ?? null;
}

export type AccreditationState =
  | { readonly kind: 'valid'; readonly expiresOn: string | null }
  | { readonly kind: 'expired'; readonly expiresOn: string }
  | { readonly kind: 'not-yet'; readonly issuedOn: string }
  | { readonly kind: 'unverified' };

/**
 * Whether an accreditation counts on a date (BR111).
 *
 * Measured against the date asked about, never against today — BR54 draws
 * the same line for a Working with Children Check, and for the same reason:
 * a certificate expiring in three weeks does not disqualify somebody from
 * Saturday, and one that lapsed last month does not become valid because
 * the coordinator is looking on a Tuesday.
 *
 * **Unverified outranks expired.** An accreditation nobody checked is not a
 * lapsed accreditation, it is an unchecked claim — and telling a
 * coordinator it "expired" implies somebody once verified it.
 */
export function accreditationOn(
  accreditation: Accreditation,
  asOf: string,
): AccreditationState {
  if (accreditation.verifiedAt === null) return { kind: 'unverified' };
  if (accreditation.issuedOn !== null && accreditation.issuedOn > asOf) {
    return { kind: 'not-yet', issuedOn: accreditation.issuedOn };
  }
  if (accreditation.expiresOn !== null && accreditation.expiresOn < asOf) {
    return { kind: 'expired', expiresOn: accreditation.expiresOn };
  }
  return { kind: 'valid', expiresOn: accreditation.expiresOn };
}

/**
 * Accreditations that will lapse within `days` of the date asked about.
 *
 * The point of the screen, rather than a nicety: a card that expires in
 * round 12 is found on a Thursday with a fixture on Saturday and nobody to
 * replace them. BR54 exists because the same failure happens with Blue
 * Cards, and the answer there was to look further ahead than today.
 */
export function lapsingWithin(
  accreditations: readonly Accreditation[],
  asOf: string,
  days: number,
): readonly Accreditation[] {
  const horizon = addDays(asOf, days);
  return accreditations.filter((a) => {
    if (a.verifiedAt === null || a.expiresOn === null) return false;
    return a.expiresOn >= asOf && a.expiresOn <= horizon;
  });
}

/** ISO date `days` after `iso`, computed in UTC so it never drifts a day. */
export function addDays(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

export type RosterFlag =
  | { readonly kind: 'retired'; readonly on: string }
  | { readonly kind: 'no-classification' }
  | { readonly kind: 'unverified-classification' }
  | { readonly kind: 'expired'; readonly what: string }
  | { readonly kind: 'lapsing'; readonly what: string; readonly on: string }
  | { readonly kind: 'unverified'; readonly what: string };

/**
 * What a coordinator needs to notice about this official, worst first.
 *
 * Ordered rather than merely collected: a roster that lists every problem
 * with equal weight is one somebody stops reading. Retired first because it
 * explains every other flag; then a missing classification, because BR8
 * cannot even be evaluated without one; then expiry, then imminent expiry,
 * then unverified.
 *
 * **An empty list means nothing is wrong**, and the screen says so rather
 * than leaving a blank cell that could equally mean "not checked".
 */
export function rosterFlags(
  referee: RefereeSummary,
  asOf: string,
  lapseHorizonDays = 60,
): readonly RosterFlag[] {
  const flags: RosterFlag[] = [];

  if (referee.retiredOn !== null && referee.retiredOn <= asOf) {
    flags.push({ kind: 'retired', on: referee.retiredOn });
  }

  const current = classificationOn(referee.classifications, asOf);
  if (current === null) {
    flags.push({ kind: 'no-classification' });
  } else if (current.sightedAt === null) {
    // Recorded from what somebody said, never checked against the register.
    // BR8 is a competency rule, so the difference matters.
    flags.push({ kind: 'unverified-classification' });
  }

  for (const a of referee.accreditations) {
    const state = accreditationOn(a, asOf);
    if (state.kind === 'expired') flags.push({ kind: 'expired', what: a.kind });
    if (state.kind === 'unverified') flags.push({ kind: 'unverified', what: a.kind });
  }

  for (const a of lapsingWithin(referee.accreditations, asOf, lapseHorizonDays)) {
    flags.push({ kind: 'lapsing', what: a.kind, on: a.expiresOn as string });
  }

  return flags;
}

/** Officials first, retired last — a roster is a working list, not an archive. */
export function rosterOrder(
  referees: readonly RefereeSummary[],
  asOf: string,
): readonly RefereeSummary[] {
  const retired = (r: RefereeSummary) => r.retiredOn !== null && r.retiredOn <= asOf;
  return [...referees].sort((a, b) => {
    if (retired(a) !== retired(b)) return retired(a) ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}
