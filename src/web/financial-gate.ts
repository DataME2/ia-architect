/**
 * The Financial Gate (scope 91): one summary of a registration's money, at
 * the top of its finance section. It answers the question the treasurer and
 * registrar actually ask ("may this player take the field, and if not, what
 * stands in the way?") with the figures behind it.
 *
 * Pure, and only a restatement: eligibility is `playEligibility` (BR79), the
 * plan is `planState` (BR3), previous seasons come from BR79's two-year
 * arrears function. A role that reads no money (BR78) gets the verdict and
 * no figures.
 */
import { formatMoney } from '../domain/finance/money.ts';
import type { PlanState } from '../domain/finance/types.ts';

export type GateTone = 'ok' | 'pending' | 'blocked' | 'neutral';

export interface GateLine {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly note: string | null;
  readonly tone: GateTone;
}

export interface FinancialGate {
  readonly mayPlay: boolean;
  readonly verdict: string;
  readonly reason: string;
  /** Empty when the reader may not see money (BR78). */
  readonly lines: readonly GateLine[];
}

export interface GateInput {
  readonly eligibility: { readonly mayPlay: boolean; readonly reason: string };
  /** False for a role that reads no money (BR78). */
  readonly readsMoney: boolean;
  /** This season's balance; negative is a credit. */
  readonly outstandingCents: number;
  readonly receivedCents: number;
  readonly vouchers: readonly { readonly state: 'ATTACHED' | 'VERIFIED' | 'REJECTED' | 'CLAIMED'; readonly faceValueCents: number }[];
  readonly plan: PlanState | null;
  /** Earlier seasons still owing, within BR79's window; this season excluded. */
  readonly earlier: readonly { readonly seasonName: string; readonly outstandingCents: number }[] | null;
}

export function financialGate(input: GateInput): FinancialGate {
  const verdict = input.eligibility.mayPlay ? 'Clear to play' : 'Not clear to play';
  if (!input.readsMoney) {
    return { mayPlay: input.eligibility.mayPlay, verdict, reason: input.eligibility.reason, lines: [] };
  }

  const lines: GateLine[] = [];

  lines.push({
    key: 'received',
    label: 'Paid so far',
    value: formatMoney(input.receivedCents),
    note: 'Payments and verified vouchers, as receipts.',
    tone: 'neutral',
  });

  const verified = input.vouchers.filter((v) => v.state === 'VERIFIED' || v.state === 'CLAIMED');
  const waiting = input.vouchers.filter((v) => v.state === 'ATTACHED');
  if (input.vouchers.length > 0) {
    const sum = (vs: typeof verified) => vs.reduce((t, v) => t + v.faceValueCents, 0);
    lines.push({
      key: 'vouchers',
      label: 'Vouchers',
      value: formatMoney(sum(verified)),
      note:
        waiting.length === 0
          ? `${verified.length} verified.`
          : `${verified.length} verified; ${waiting.length} (${formatMoney(sum(waiting))}) waiting for the treasurer to verify (BR78).`,
      tone: waiting.length > 0 ? 'pending' : 'ok',
    });
  }

  const owed = input.outstandingCents;
  lines.push({
    key: 'outstanding',
    label: 'Outstanding this season',
    value: owed < 0 ? `${formatMoney(-owed)} credit` : formatMoney(owed),
    note:
      owed < 0
        ? 'The club holds a credit; it is never an obstacle (BR3).'
        : owed === 0
          ? 'Nothing owed.'
          : input.plan === null
            ? 'Due in full; no payment plan agreed.'
            : 'Being paid under a plan.',
    tone: owed <= 0 ? 'ok' : input.plan !== null && input.plan.arrearsCents === 0 ? 'pending' : 'blocked',
  });

  if (input.plan !== null) {
    const p = input.plan;
    const paidCount = p.installments.filter((s) => s.outstandingCents === 0).length;
    lines.push({
      key: 'plan',
      label: 'Payment plan',
      value: p.arrearsCents > 0 ? `${formatMoney(p.arrearsCents)} in arrears` : 'On track',
      note:
        `${paidCount} of ${p.installments.length} instalments paid` +
        (p.nextDue === null
          ? '.'
          : `; next ${formatMoney(p.nextDue.outstandingCents)} due ${p.nextDue.installment.dueOn}.`),
      tone: p.arrearsCents > 0 ? 'blocked' : 'ok',
    });
  }

  if (input.earlier === null) {
    lines.push({
      key: 'earlier',
      label: 'Earlier seasons',
      value: 'Not shown',
      note: 'The two-year arrears report is not readable by your role (BR142).',
      tone: 'neutral',
    });
  } else {
    const total = input.earlier.reduce((t, e) => t + e.outstandingCents, 0);
    lines.push({
      key: 'earlier',
      label: 'Earlier seasons',
      value: formatMoney(total),
      note:
        total === 0
          ? 'Nothing owed from the last two years.'
          : `${input.earlier.map((e) => `${e.seasonName}: ${formatMoney(e.outstandingCents)}`).join(' · ')}. Pursued or amended with a reason, never written off silently (BR79).`,
      // Amber, not red: eligibility (`playEligibility`) is this season's
      // balance, so an old debt is to pursue, and must not read as the reason
      // a player shown "clear" is stopped (scope 91 gap).
      tone: total > 0 ? 'pending' : 'ok',
    });
  }

  return { mayPlay: input.eligibility.mayPlay, verdict, reason: input.eligibility.reason, lines };
}
