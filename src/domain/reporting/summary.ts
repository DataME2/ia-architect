/**
 * Turning figures into the sentences a committee reads.
 *
 * Pure, and this is the layer where BR143 is actually enforced: a
 * percentage is never returned on its own, only alongside the base it came
 * from. A screen *could* render `47` and drop `of 312`; it cannot get that
 * from here, because there is no function that gives it one without the
 * other.
 */
import type { FinanceFigures, OfficiatingFigures, RegistrationFigures } from './types.ts';

export interface Proportion {
  readonly count: number;
  readonly of: number;
  /** Whole percent. Null where the base is zero — see below. */
  readonly percent: number | null;
  /** Always safe to render: carries the base (BR143). */
  readonly label: string;
}

/**
 * A count against its base.
 *
 * A zero base yields a null percent rather than a zero one. "0% complete"
 * for a season with no registrations reads as a failure; "none yet" reads
 * as the truth, and the difference matters on a screen somebody acts on.
 */
export function proportion(count: number, of: number): Proportion {
  if (of === 0) return { count, of, percent: null, label: 'none yet' };
  const percent = Math.round((count / of) * 100);
  return { count, of, percent, label: `${count} of ${of} (${percent}%)` };
}

export interface RegistrationReport {
  readonly complete: Proportion;
  readonly outstanding: Proportion;
  /** What the incomplete are waiting on, most common first. */
  readonly blockers: readonly { readonly ruleId: string; readonly count: number }[];
}

export function registrationReport(f: RegistrationFigures): RegistrationReport {
  const outstanding = f.total - f.complete;
  return {
    complete: proportion(f.complete, f.total),
    outstanding: proportion(outstanding, f.total),
    blockers: Object.entries(f.blockedBy)
      .map(([ruleId, count]) => ({ ruleId, count }))
      // Most common first: a registrar's afternoon is best spent on the
      // rule blocking forty families, not the one blocking two.
      .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId)),
  };
}

export interface FinanceReport {
  readonly owing: Proportion;
  readonly outstandingCents: number;
  readonly creditCents: number;
  readonly overdueCents: number;
  readonly onAPlan: Proportion;
  /** Of what is outstanding, how much is already overdue. */
  readonly overdueShare: Proportion;
  readonly voucherReliefCents: number;
  readonly vouchersAwaitingVerification: number;
}

export function financeReport(f: FinanceFigures): FinanceReport {
  return {
    owing: proportion(f.owing, f.registrations),
    // Owing and credit are reported apart rather than netted: a club owed
    // $800 that owes $200 back is not a club owed $600, and netting hides
    // both numbers a treasurer needs.
    outstandingCents: f.outstandingCents,
    creditCents: f.creditCents,
    overdueCents: f.overdueCents,
    onAPlan: proportion(f.onAPlan, f.owing),
    overdueShare: proportion(f.overdueCents, f.outstandingCents),
    voucherReliefCents: f.voucherReliefCents,
    // BR81 — attached is not relief. Surfaced as work waiting rather than
    // folded into the relief figure, which would overstate what the club
    // has actually collected.
    vouchersAwaitingVerification: f.vouchersAttached,
  };
}

export interface OfficiatingReport {
  readonly accepted: Proportion;
  readonly declined: Proportion;
  readonly awaitingResponse: number;
  readonly approvedCents: number;
  readonly claimsAwaitingApproval: number;
  /** BR13: an unverified appointment cannot be claimed for. */
  readonly verificationsOutstanding: number;
}

export function officiatingReport(f: OfficiatingFigures): OfficiatingReport {
  return {
    accepted: proportion(f.accepted, f.appointments),
    // BR112: only a *recorded* decline counts, and a decline is not
    // recorded without a reason — so this is a real rate rather than an
    // artefact of who bothered to explain themselves.
    declined: proportion(f.declined, f.appointments),
    awaitingResponse: f.proposed,
    approvedCents: f.approvedCents,
    claimsAwaitingApproval: f.claimsRaised,
    verificationsOutstanding: f.unverifiedFixtures,
  };
}
