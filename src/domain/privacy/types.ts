/**
 * Forgetting, and the reasons not to.
 *
 * Erasure (BR49) and retention (BR40) are one piece of machinery seen from
 * two directions: both ask *is there a reason this record must stay?*, and
 * differ only in who is asking and what happens when the answer is no. So
 * there is one vocabulary of reasons here, and both directions read it.
 */
import type { IsoDate } from '../types.ts';

/**
 * A reason a record must be kept, and when that reason lapses.
 *
 * `expiresOn: null` is indefinite — which today means life membership
 * (BR70) and a legal hold somebody entered by hand. Everything else has a
 * date, and the date is what lets a refusal say *when* instead of *no*.
 */
export const RETENTION_BASES = [
  'statutory_financial',
  'child_safety',
  'active_eligibility',
  'life_member',
  'legal_hold',
] as const;

export type RetentionBasisKind = (typeof RETENTION_BASES)[number];

export interface RetentionBasis {
  readonly basis: RetentionBasisKind;
  readonly expiresOn: IsoDate | null;
  readonly detail: string | null;
}

/**
 * The privacy framework binding a tenant (BR52).
 *
 * Determined by jurisdiction and then **recorded**, not recomputed: a club
 * that changes jurisdiction does not retroactively change the framework its
 * existing records were collected under.
 */
export type PrivacyFramework = 'AU_PRIVACY_ACT' | 'NZ_PRIVACY_ACT';

/**
 * How long each kind of record must be kept, per framework.
 *
 * **These are defaults a club can point at, not legal advice.** Seven years
 * for financial records and until twenty-five for child-safety records are
 * the figures in common use on both sides of the Tasman; they live here as
 * configuration so a club's own counsel can move them, and the code says
 * plainly that nobody here is a lawyer.
 */
export interface StatutoryMinimums {
  readonly financialYears: number;
  readonly childSafetyUntilAge: number;
  /** BR40's floor for a Person still active in football. */
  readonly activeParticipationYears: number;
}

export const MINIMUMS: Readonly<Record<PrivacyFramework, StatutoryMinimums>> = {
  AU_PRIVACY_ACT: { financialYears: 7, childSafetyUntilAge: 25, activeParticipationYears: 10 },
  NZ_PRIVACY_ACT: { financialYears: 7, childSafetyUntilAge: 25, activeParticipationYears: 10 },
};

/** BR52: derived once, at provisioning, from the jurisdiction on the club. */
export function frameworkForJurisdiction(jurisdiction: string): PrivacyFramework {
  return jurisdiction.toUpperCase().startsWith('NZ') ? 'NZ_PRIVACY_ACT' : 'AU_PRIVACY_ACT';
}
