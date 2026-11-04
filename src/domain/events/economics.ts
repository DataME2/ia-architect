/**
 * BR209 — an event's profitability is computed deterministically from its
 * budget lines. BR208 — every figure states its basis.
 *
 * This is the one calculation behind both the public event calculator
 * (BR222, scope 135) and, from scope 134's WP2, a club's own event budget.
 * One function is the point: if the public page and the club's budget did
 * their own arithmetic, a club would sign in and find a different answer to
 * the question it had already been given, and nobody could say which was
 * right.
 *
 * **The model.** Each line is income or a cost, in a category, with a
 * **unit** that says what it multiplies by:
 *
 *   fixed                   once
 *   perDay                  × days
 *   perTeam                 × teams
 *   perParticipant          × participants (all, juniors or seniors)
 *   perParticipantPerDay    × participants × days
 *
 * The units are what a carnival (charged per team) and a football holiday
 * clinic (charged per participant per day) actually need; a single
 * "per participant" rate could express neither honestly.
 *
 * **Break-even** is the smallest whole number of participants (or teams,
 * for an event charged per team) at which income covers costs, holding
 * everything else as entered: days stay fixed, juniors and seniors keep the
 * same proportion, and — when counting teams — each team brings the same
 * number of players. Where each extra participant costs at least what they
 * bring in, the event cannot break even by growing, and the answer says so
 * rather than returning a negative or an infinite number.
 *
 * Integer cents throughout, and break-even is solved exactly in integers:
 * a rounding error in a break-even is a club planning around the wrong
 * number of entries.
 *
 * Rejected: a per-participant "average cost" input. It hides which costs
 * are fixed, and fixed costs are the whole reason an event has a
 * break-even at all.
 */
import type { Currency } from '../finance/currency.ts';

export const LINE_UNITS = ['fixed', 'perDay', 'perTeam', 'perParticipant', 'perParticipantPerDay'] as const;
export type LineUnit = (typeof LINE_UNITS)[number];

/** Who a per-participant line counts. Ignored for every other unit. */
export const LINE_PARTICIPANTS = ['all', 'junior', 'senior'] as const;
export type LineParticipants = (typeof LINE_PARTICIPANTS)[number];

export const REVENUE_CATEGORIES = ['entry-fees', 'sponsorship', 'other-income'] as const;
export type RevenueCategory = (typeof REVENUE_CATEGORIES)[number];

export const EXPENSE_CATEGORIES = [
  'venue',
  'equipment',
  'coaching',
  'referees',
  'insurance',
  'marketing',
  'administration',
  'sanctioning',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * BR208's four bases, **strongest first**. A figure computed from several
 * lines takes the weakest basis among them: a surplus resting on one
 * assumption is an assumption.
 */
export const LINE_BASES = ['actual', 'published-policy', 'calculated-estimate', 'assumption'] as const;
export type LineBasis = (typeof LINE_BASES)[number];

export type BudgetLine =
  | {
      readonly label: string;
      readonly direction: 'revenue';
      readonly category: RevenueCategory;
      readonly unit: LineUnit;
      readonly participants: LineParticipants;
      /** Whole, non-negative cents per unit. */
      readonly amountCents: number;
      readonly basis: LineBasis;
    }
  | {
      readonly label: string;
      readonly direction: 'expense';
      readonly category: ExpenseCategory;
      readonly unit: LineUnit;
      readonly participants: LineParticipants;
      readonly amountCents: number;
      readonly basis: LineBasis;
    };

/** The event's size. Whole, non-negative counts. */
export interface EventShape {
  readonly days: number;
  readonly teams: number;
  readonly juniors: number;
  readonly seniors: number;
}

/** What break-even counts: participants, or teams for an event charged per team. */
export type BreakEvenDriver = 'participants' | 'teams';

export type BreakEven =
  /** Income covers costs at `count`; zero when fixed income already covers fixed costs. */
  | { readonly kind: 'reached'; readonly driver: BreakEvenDriver; readonly count: number }
  /** Each extra participant (or team) costs at least what it brings in. */
  | { readonly kind: 'not-reachable'; readonly driver: BreakEvenDriver }
  /** The shape lacks what the answer depends on — named in `missing`. */
  | { readonly kind: 'needs-shape'; readonly driver: BreakEvenDriver; readonly missing: 'teams' | 'participants' };

export interface CategoryTotal<C extends string> {
  readonly category: C;
  readonly cents: number;
}

export interface EventFigures {
  readonly currency: Currency;
  readonly revenueCents: number;
  readonly costCents: number;
  /** Negative is a deficit. */
  readonly surplusCents: number;
  /** Each line's total, in the order given. */
  readonly lineTotals: readonly number[];
  /** Only categories with something in them, largest first. */
  readonly revenueByCategory: readonly CategoryTotal<RevenueCategory>[];
  readonly costByCategory: readonly CategoryTotal<ExpenseCategory>[];
  /** Absent, not zero, when there are no participants to divide by. */
  readonly perParticipant: { readonly revenueCents: number; readonly costCents: number } | null;
  readonly breakEven: BreakEven;
  /** The weakest basis among the lines that carry an amount (BR208). */
  readonly basis: LineBasis;
}

function assertCount(name: string, n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`${name} must be a whole number of zero or more, not ${n}.`);
  }
}

function assertLine(line: BudgetLine): void {
  if (!Number.isSafeInteger(line.amountCents) || line.amountCents < 0) {
    throw new RangeError(`"${line.label}" must be whole cents of zero or more, not ${line.amountCents}.`);
  }
}

function headcount(shape: EventShape, who: LineParticipants): number {
  if (who === 'junior') return shape.juniors;
  if (who === 'senior') return shape.seniors;
  return shape.juniors + shape.seniors;
}

const isPerParticipant = (unit: LineUnit): boolean => unit === 'perParticipant' || unit === 'perParticipantPerDay';

/** How many times a line's amount applies to an event of this shape. */
export function lineMultiplier(line: Pick<BudgetLine, 'unit' | 'participants'>, shape: EventShape): number {
  switch (line.unit) {
    case 'fixed':
      return 1;
    case 'perDay':
      return shape.days;
    case 'perTeam':
      return shape.teams;
    case 'perParticipant':
      return headcount(shape, line.participants);
    case 'perParticipantPerDay':
      return headcount(shape, line.participants) * shape.days;
  }
}

const sign = (line: BudgetLine): 1 | -1 => (line.direction === 'revenue' ? 1 : -1);

/** Ceiling of a / b for a ≥ 0 and b > 0, in integers. */
function ceilDiv(a: number, b: number): number {
  return Math.floor((a + b - 1) / b);
}

/**
 * The smallest participant (or team) count at which income covers costs.
 *
 * The net is linear in the count: `fixedNet + count × perUnit`. `perUnit` is
 * a ratio whenever juniors and seniors are charged differently, so it is
 * carried as an integer numerator over an integer denominator and the
 * division happens once, as a ceiling, at the end.
 */
export function breakEven(lines: readonly BudgetLine[], shape: EventShape, driver: BreakEvenDriver): BreakEven {
  const people = shape.juniors + shape.seniors;
  const splits = lines.some((l) => isPerParticipant(l.unit) && l.participants !== 'all' && l.amountCents > 0);

  // Per-participant lines, weighted so that their sum divided by `people`
  // is the average amount one participant brings in or costs, at the mix
  // entered. With nobody entered yet and no junior/senior split, one
  // participant is one participant: weight 1, denominator 1.
  const weight = (who: LineParticipants): number => {
    if (people === 0) return who === 'all' ? 1 : 0;
    return headcount(shape, who);
  };
  const participantNumerator = lines
    .filter((l) => isPerParticipant(l.unit))
    .reduce((sum, l) => sum + sign(l) * l.amountCents * (l.unit === 'perParticipantPerDay' ? shape.days : 1) * weight(l.participants), 0);
  const participantDenominator = people === 0 ? 1 : people;

  const fixedPart = (l: BudgetLine): number =>
    l.unit === 'fixed' || l.unit === 'perDay' ? sign(l) * l.amountCents * lineMultiplier(l, shape) : 0;

  if (driver === 'participants') {
    if (people === 0 && splits) return { kind: 'needs-shape', driver, missing: 'participants' };
    // Teams stay as entered, so per-team lines count as fixed here.
    const fixedNet = lines.reduce(
      (sum, l) => sum + fixedPart(l) + (l.unit === 'perTeam' ? sign(l) * l.amountCents * shape.teams : 0),
      0,
    );
    if (fixedNet >= 0) return { kind: 'reached', driver, count: 0 };
    if (participantNumerator <= 0) return { kind: 'not-reachable', driver };
    return { kind: 'reached', driver, count: ceilDiv(-fixedNet * participantDenominator, participantNumerator) };
  }

  // Counting teams: each team brings people / teams participants, so one
  // more team adds its per-team lines plus that share of every
  // per-participant line. Multiplied through by `teams`, the per-team
  // contribution is `teams × perTeam + participantNumerator × people /
  // participantDenominator`, which is `participantNumerator` itself once
  // anyone is entered.
  if (shape.teams === 0) return { kind: 'needs-shape', driver, missing: 'teams' };
  const fixedNet = lines.reduce((sum, l) => sum + fixedPart(l), 0);
  if (fixedNet >= 0) return { kind: 'reached', driver, count: 0 };
  const perTeamTimesTeams =
    lines.filter((l) => l.unit === 'perTeam').reduce((sum, l) => sum + sign(l) * l.amountCents, 0) * shape.teams +
    (people === 0 ? 0 : participantNumerator);
  if (perTeamTimesTeams <= 0) return { kind: 'not-reachable', driver };
  return { kind: 'reached', driver, count: ceilDiv(-fixedNet * shape.teams, perTeamTimesTeams) };
}

function byCategory<C extends string>(entries: readonly { category: C; cents: number }[]): CategoryTotal<C>[] {
  const totals = new Map<C, number>();
  for (const e of entries) totals.set(e.category, (totals.get(e.category) ?? 0) + e.cents);
  return [...totals]
    .filter(([, cents]) => cents > 0)
    .map(([category, cents]) => ({ category, cents }))
    .sort((a, b) => b.cents - a.cents || a.category.localeCompare(b.category));
}

function weakestBasis(lines: readonly BudgetLine[]): LineBasis {
  let weakest = 0;
  for (const l of lines) {
    if (l.amountCents > 0) weakest = Math.max(weakest, LINE_BASES.indexOf(l.basis));
  }
  // An empty budget rests on nothing, which is no stronger than an assumption.
  return lines.some((l) => l.amountCents > 0) ? (LINE_BASES[weakest] ?? 'assumption') : 'assumption';
}

/**
 * An event's figures from its lines (BR209). Pure: the same lines and shape
 * give the same figures everywhere. Expected and actual figures are two
 * calls — one with what was planned, one with what happened — so they are
 * never blended.
 */
export function eventEconomics(
  lines: readonly BudgetLine[],
  shape: EventShape,
  driver: BreakEvenDriver,
  currency: Currency,
): EventFigures {
  assertCount('Days', shape.days);
  assertCount('Teams', shape.teams);
  assertCount('Juniors', shape.juniors);
  assertCount('Seniors', shape.seniors);
  lines.forEach(assertLine);

  const lineTotals = lines.map((l) => l.amountCents * lineMultiplier(l, shape));
  let revenueCents = 0;
  let costCents = 0;
  const revenue: { category: RevenueCategory; cents: number }[] = [];
  const cost: { category: ExpenseCategory; cents: number }[] = [];
  lines.forEach((l, i) => {
    const cents = lineTotals[i] ?? 0;
    if (l.direction === 'revenue') {
      revenueCents += cents;
      revenue.push({ category: l.category, cents });
    } else {
      costCents += cents;
      cost.push({ category: l.category, cents });
    }
  });

  const people = shape.juniors + shape.seniors;
  return {
    currency,
    revenueCents,
    costCents,
    surplusCents: revenueCents - costCents,
    lineTotals,
    revenueByCategory: byCategory(revenue),
    costByCategory: byCategory(cost),
    perParticipant:
      people === 0
        ? null
        : { revenueCents: Math.round(revenueCents / people), costCents: Math.round(costCents / people) },
    breakEven: breakEven(lines, shape, driver),
    basis: weakestBasis(lines),
  };
}

/**
 * The same event with its break-even count scaled by a percentage, for a
 * scenario (BR212). Counting participants scales juniors and seniors alike;
 * counting teams scales teams and, with them, participants. Rounded to whole
 * people and teams, never below zero. Days never change.
 */
export function scaleShape(shape: EventShape, driver: BreakEvenDriver, percent: number): EventShape {
  const scale = (n: number) => Math.max(0, Math.round((n * (100 + percent)) / 100));
  return {
    days: shape.days,
    teams: driver === 'teams' ? scale(shape.teams) : shape.teams,
    juniors: scale(shape.juniors),
    seniors: scale(shape.seniors),
  };
}
