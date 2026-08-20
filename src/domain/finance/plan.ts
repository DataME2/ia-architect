/**
 * Building a payment plan, and working out where one stands.
 *
 * Pure and cent-exact. Money is integers throughout: a plan that splits
 * $120.50 three ways in floating point loses a third of a cent per
 * instalment, and a treasurer finds it a season later in a reconciliation
 * nobody can explain.
 */
import type { IsoDate } from '../types.ts';
import type {
  Installment,
  InstallmentState,
  Payment,
  PlanCadence,
  PlanState,
} from './types.ts';

const DAYS_PER_CADENCE: Readonly<Record<Exclude<PlanCadence, 'monthly'>, number>> = {
  weekly: 7,
  fortnightly: 14,
};

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

/**
 * `n` cadence steps after `from`.
 *
 * Monthly clamps to the end of a short month rather than rolling into the
 * next one: a plan starting 31 January must produce 28 February, not 3
 * March, or the instalment a family was told about lands in a different
 * month from the one on their calendar.
 */
export function advance(from: IsoDate, cadence: PlanCadence, steps: number): IsoDate {
  const start = toUtc(from);
  if (cadence !== 'monthly') {
    const moved = new Date(start);
    moved.setUTCDate(moved.getUTCDate() + DAYS_PER_CADENCE[cadence] * steps);
    return toIso(moved);
  }

  const day = start.getUTCDate();
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + steps, 1));
  const lastOfMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastOfMonth));
  return toIso(target);
}

export type ScheduleResult =
  | { readonly ok: true; readonly installments: readonly Installment[] }
  | { readonly ok: false; readonly error: string };

/**
 * Split a total into `count` instalments on a cadence.
 *
 * **BR74: the instalments sum to exactly the total.** An even split rarely
 * divides, so the remainder cents go onto the *first* instalment rather
 * than being rounded away — the club is owed them, the family is told about
 * them up front, and the last instalment, the one most likely to be chased,
 * stays the round number everybody expects.
 */
export function buildSchedule(
  totalCents: number,
  count: number,
  firstDueOn: IsoDate,
  cadence: PlanCadence,
): ScheduleResult {
  if (!Number.isInteger(totalCents) || totalCents <= 0) {
    return { ok: false, error: 'A payment plan needs a positive total.' };
  }
  if (!Number.isInteger(count) || count < 1) {
    return { ok: false, error: 'A payment plan needs at least one instalment.' };
  }
  if (count > totalCents) {
    return {
      ok: false,
      error: `${count} instalments cannot divide ${totalCents} cents — one would be worth nothing.`,
    };
  }

  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  const installments: Installment[] = [];
  for (let i = 0; i < count; i += 1) {
    installments.push({
      sequence: i + 1,
      dueOn: advance(firstDueOn, cadence, i),
      amountCents: i === 0 ? base + remainder : base,
    });
  }
  return { ok: true, installments };
}

/**
 * Whether the plan finishes inside the season it is for (BR76).
 *
 * A plan running past the end of the season leaves the club chasing money
 * for a child who has already stopped playing, which is the point at which
 * the leverage — and usually the contact — is gone.
 */
export function finishesWithinSeason(
  installments: readonly Installment[],
  seasonEndsOn: IsoDate,
): boolean {
  const last = installments.at(-1);
  return last === undefined || last.dueOn <= seasonEndsOn;
}

/** Payments net of nothing — the raw sum, refunds and corrections included. */
export function totalReceived(payments: readonly Payment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0);
}

/**
 * Where a plan stands as at a date.
 *
 * Payments are allocated **oldest instalment first**, and nothing records
 * which payment paid which instalment. That is deliberate: a family paying
 * $50 against a $40 instalment has not made a statement about allocation,
 * and storing a guess as if it were one turns an arithmetic question into a
 * disputed fact. Oldest-first is the convention, it is applied at read
 * time, and it can be re-derived from the receipts at any point.
 */
export function planState(
  totalCents: number,
  installments: readonly Installment[],
  payments: readonly Payment[],
  asAt: IsoDate,
): PlanState {
  const paidCents = totalReceived(payments);
  let unallocated = Math.max(0, paidCents);

  const states: InstallmentState[] = [];
  for (const installment of [...installments].sort((a, b) => a.sequence - b.sequence)) {
    const applied = Math.min(unallocated, installment.amountCents);
    unallocated -= applied;
    const outstandingCents = installment.amountCents - applied;
    states.push({
      installment,
      paidCents: applied,
      outstandingCents,
      overdue: outstandingCents > 0 && installment.dueOn < asAt,
    });
  }

  return {
    totalCents,
    paidCents,
    outstandingCents: totalCents - paidCents,
    installments: states,
    // An instalment due *today* is not in arrears: the family has the day to
    // pay it, and a plan that reports a family behind on the morning the
    // money is due teaches everyone to ignore the arrears figure.
    arrearsCents: states
      .filter((s) => s.overdue)
      .reduce((sum, s) => sum + s.outstandingCents, 0),
    nextDue: states.find((s) => s.outstandingCents > 0) ?? null,
  };
}
