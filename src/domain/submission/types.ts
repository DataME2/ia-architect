/**
 * Registration Submission Pack (C16, BR58–BR60).
 *
 * The artifact the club hands to the governing body to import — or, when the
 * federation does not import it, the guided data source a person keys in
 * from. Both readings are served by the same rows, which is what makes the
 * capability pay for itself either way.
 */
import type { Payment, PaymentPlan } from '../finance/types.ts';
import type { DuplicateCandidate } from '../identity/br5-duplicate-candidates.ts';
import type {
  Consent, Guardianship, IsoDate, IsoInstant, Person, Registration,
} from '../types.ts';
import type { RuleId } from '../rules/types.ts';

/** Everything the builder needs about one candidate registration. */
export interface PackCandidate {
  readonly registration: Registration;
  readonly person: Person;
  readonly guardianships: readonly Guardianship[];
  /** Guardians, resolvable by id — the pack names a contactable adult. */
  readonly guardianPeople: readonly Person[];
  readonly consents: readonly Consent[];
  /** The live payment plan, if the family is paying by instalments (BR3). */
  readonly paymentPlan: PaymentPlan | null;
  /** Receipts against this registration, for BR3's arrears question. */
  readonly payments: readonly Payment[];
  /** Unresolved BR5 candidates. Any at all excludes the registration. */
  readonly duplicateCandidates: readonly DuplicateCandidate[];
}

export interface PackOptions {
  readonly clubId: string;
  readonly seasonId: string;
  /** BR58: monotonic per club and season. A resend is a new version. */
  readonly version: number;
  readonly generatedAt: IsoInstant;
  readonly generatedByUserId: string;
  /**
   * BR59: whether photographs travel with the pack.
   *
   * Required rather than defaulted, because a single file carrying hundreds
   * of children's images is a decision someone should make on purpose each
   * season, not inherit from a default.
   */
  readonly includePhotographs: boolean;
  /** The date validation is evaluated against. */
  readonly asAt: IsoDate;
}

/**
 * One row of the pack — BR59's minimised field set.
 *
 * Note what is absent: the preferred name (BR55 — the legal name is what the
 * federation matches on, and letting the everyday name leak here is the
 * failure the whole rule exists to prevent), and anything financial,
 * medical, or communications-related, none of which is registration data.
 */
export interface PackRow {
  readonly personId: string;
  readonly legalGivenNames: string;
  readonly legalFamilyName: string;
  readonly dateOfBirth: IsoDate;
  readonly email: string | null;
  readonly guardianLegalName: string | null;
  readonly guardianEmail: string | null;
  /** Present only when photographs were included *and* consent covers it. */
  readonly photoPath: string | null;
}

export type ExclusionReason =
  | 'validation-failed'
  | 'unresolved-duplicate'
  | 'wrong-club'
  | 'wrong-season';

export interface ExcludedCandidate {
  readonly personId: string;
  readonly reason: ExclusionReason;
  /** Which rules failed, when the reason is validation. */
  readonly ruleIds: readonly RuleId[];
  /** Plain enough for the registrar to fix it. */
  readonly detail: string;
}

/**
 * An immutable, versioned pack (BR58).
 *
 * `Object.freeze`d on construction so "immutable" is a property of the value
 * rather than a comment. Correcting anything means building a new version.
 */
export interface SubmissionPack {
  readonly clubId: string;
  readonly seasonId: string;
  readonly version: number;
  readonly generatedAt: IsoInstant;
  readonly generatedByUserId: string;
  readonly includesPhotographs: boolean;
  readonly rows: readonly PackRow[];
  /** BR58: every Person the pack covers. */
  readonly manifest: readonly string[];
  /** Everyone left out, and why — the registrar's work list. */
  readonly excluded: readonly ExcludedCandidate[];
}

export type SubmissionState = 'sent' | 'confirmed_present' | 'rejected';

export interface SubmissionRecord {
  readonly submissionPackVersion: number;
  readonly personId: string;
  readonly state: SubmissionState;
  readonly rejectionReason: string | null;
}
