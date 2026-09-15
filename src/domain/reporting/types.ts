/**
 * What a report is, and the thing every figure in one must carry.
 *
 * BR143: a figure states the base it was computed over and the moment it
 * was computed. That already holds for a player's totals (BR102) and a
 * reconciliation result (BR46); a dashboard is where the temptation to drop
 * it is strongest and the cost is highest, because a number on a
 * committee's screen is acted on. "47 outstanding" means nothing without
 * *of how many, and as at when*.
 */

/**
 * A figure, or the reason there isn't one.
 *
 * BR142 lives in this type. A report the reader may not have is `refused`,
 * never a total of whatever rows happened to be visible — Row-Level
 * Security hides rows and does not refuse sums, so a coach aggregating
 * `payment` would be shown a confident zero.
 */
export type Report<T> =
  | { readonly kind: 'ready'; readonly figures: T; readonly computedAt: string }
  | { readonly kind: 'refused'; readonly because: string };

export interface RegistrationFigures {
  readonly total: number;
  readonly complete: number;
  readonly pendingDocuments: number;
  readonly pendingPayment: number;
  readonly pendingExternal: number;
  readonly draft: number;
  /** Rule identifier to how many registrations it is blocking. */
  readonly blockedBy: Readonly<Record<string, number>>;
}

export interface FinanceFigures {
  readonly registrations: number;
  readonly owing: number;
  readonly outstandingCents: number;
  readonly creditCents: number;
  readonly onAPlan: number;
  readonly instalmentsOverdue: number;
  readonly overdueCents: number;
  readonly vouchersAttached: number;
  readonly vouchersVerified: number;
  readonly voucherReliefCents: number;
}

/**
 * One Person's arrear from one season, still inside BR79's two-year
 * visibility window. `lastAction` is the Treasurer's most recent recorded
 * response, if any — `null` means nobody has recorded chasing it yet.
 */
export interface ArrearsRow {
  readonly personId: string;
  readonly personName: string;
  readonly seasonId: string;
  readonly seasonName: string;
  readonly seasonEndedOn: string;
  readonly outstandingCents: number;
  readonly ageDays: number;
  readonly lastAction: 'payment_requested' | 'amendment_recorded' | null;
  readonly lastActionAt: string | null;
}

export interface OfficiatingFigures {
  readonly officials: number;
  readonly appointments: number;
  readonly accepted: number;
  readonly proposed: number;
  readonly declined: number;
  readonly withdrawn: number;
  readonly claimsRaised: number;
  readonly claimsApproved: number;
  readonly approvedCents: number;
  readonly unverifiedFixtures: number;
}
