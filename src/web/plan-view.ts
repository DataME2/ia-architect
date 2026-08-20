/**
 * The payment plan screen's decisions.
 *
 * Pure, like the rest of `src/web/`: no React, no I/O. What a registrar or
 * treasurer sees about a plan — the wording of its state, the preview of a
 * schedule before it is agreed, and what a form's fields mean — is decided
 * here and rendered there.
 */
import { buildSchedule, finishesWithinSeason } from '../domain/finance/plan.ts';
import { PLAN_CADENCES, PAYMENT_METHODS } from '../domain/finance/types.ts';
import type {
  Installment,
  PaymentMethod,
  PlanCadence,
  PlanState,
} from '../domain/finance/types.ts';
import type { IsoDate } from '../domain/types.ts';
import { formatCents, parseAmountCents } from './money.ts';

export const CADENCE_LABEL: Readonly<Record<PlanCadence, string>> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

export const METHOD_LABEL: Readonly<Record<PaymentMethod, string>> = {
  card: 'Card',
  'bank-transfer': 'Bank transfer',
  cash: 'Cash',
  voucher: 'Voucher',
  adjustment: 'Adjustment',
};

export function parseCadence(value: unknown): PlanCadence | null {
  return typeof value === 'string' && (PLAN_CADENCES as readonly string[]).includes(value)
    ? (value as PlanCadence)
    : null;
}

export function parseMethod(value: unknown): PaymentMethod | null {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value)
    ? (value as PaymentMethod)
    : null;
}

/**
 * `YYYY-MM-DD` that is a real calendar date.
 *
 * `2026-02-31` parses happily as a string and rolls into March once a
 * database sees it, which is an instalment falling due in a month nobody
 * agreed to.
 */
export function parseDueDate(value: string): IsoDate | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    ? trimmed
    : null;
}

export interface PlanDraft {
  readonly totalCents: number;
  readonly instalmentCount: number;
  readonly firstDueOn: IsoDate;
  readonly cadence: PlanCadence;
}

export type DraftResult =
  | { readonly ok: true; readonly draft: PlanDraft; readonly preview: readonly Installment[] }
  | { readonly ok: false; readonly error: string };

/**
 * Parse and preview a plan before it is agreed.
 *
 * Reports one error at a time here rather than all of them, unlike the
 * registration form: a plan has four fields and each one changes what the
 * next means, so a list of four complaints about a form the registrar has
 * half-filled is noise.
 */
export function parsePlanDraft(
  input: {
    readonly total: string;
    readonly count: string;
    readonly firstDueOn: string;
    readonly cadence: unknown;
  },
  seasonEndsOn: IsoDate,
): DraftResult {
  const total = parseAmountCents(input.total);
  if (!total.ok) return { ok: false, error: total.error };
  if (total.cents <= 0) return { ok: false, error: 'A payment plan needs a positive total.' };

  const count = Number(input.count.trim());
  if (!Number.isInteger(count) || count < 1) {
    return { ok: false, error: 'Enter a whole number of instalments, at least one.' };
  }

  const firstDueOn = parseDueDate(input.firstDueOn);
  if (firstDueOn === null) {
    return { ok: false, error: 'Enter the first due date as a real calendar date.' };
  }

  const cadence = parseCadence(input.cadence);
  if (cadence === null) return { ok: false, error: 'Choose how often instalments fall due.' };

  const schedule = buildSchedule(total.cents, count, firstDueOn, cadence);
  if (!schedule.ok) return { ok: false, error: schedule.error };

  if (!finishesWithinSeason(schedule.installments, seasonEndsOn)) {
    return {
      ok: false,
      error: `The last instalment falls on ${schedule.installments.at(-1)?.dueOn}, after the season ends on ${seasonEndsOn} (BR76).`,
    };
  }

  return {
    ok: true,
    draft: { totalCents: total.cents, instalmentCount: count, firstDueOn, cadence },
    preview: schedule.installments,
  };
}

/**
 * One sentence a registrar can act on.
 *
 * Leads with arrears where there are any, because that is the thing that
 * blocks the registration under BR3 — the balance is context, not the
 * problem.
 */
export function planSummary(state: PlanState): string {
  if (state.arrearsCents > 0) {
    return `${formatCents(state.arrearsCents)} overdue of ${formatCents(state.totalCents)} — this is what BR3 is failing on, not the balance.`;
  }
  if (state.outstandingCents <= 0) {
    return state.outstandingCents === 0
      ? 'Paid in full.'
      : `Paid in full, with a credit of ${formatCents(-state.outstandingCents)}.`;
  }
  const next = state.nextDue;
  return next === null
    ? `${formatCents(state.outstandingCents)} outstanding.`
    : `Up to date. ${formatCents(state.outstandingCents)} still to come; next instalment ${formatCents(next.installment.amountCents - next.paidCents)} on ${next.installment.dueOn}.`;
}
