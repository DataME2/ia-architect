/**
 * What the public event calculator decides (BR222, scope 135).
 *
 * Every figure comes from `eventEconomics` (BR209) — the same function a
 * club's own event budget will use — so this module never adds anything up.
 * It decides what a visitor is offered (presets per event type), what what
 * they typed means (amounts and counts, refused rather than guessed), and
 * how the answer is said. Pure, so all of that is tested without a browser.
 *
 * Three refusals are deliberate:
 *
 * - **No preset carries an amount.** Presets name the lines an event of
 *   that type usually has and leave every amount blank. A governing body's
 *   charge in particular is never filled in (BR211): until PitchPeople
 *   holds a verified copy of a published policy (open question #123), the
 *   charge is the visitor's own figure, labelled as one.
 * - **An invalid entry hides the estimate** instead of being read as zero.
 *   A typo turning into a A$0 cost line would make the event look more
 *   profitable than it is.
 * - **Nothing here sends or keeps anything.** The state is the visitor's,
 *   in their browser; there is no function in this module that could store
 *   it.
 */
import {
  eventEconomics,
  scaleShape,
  type BreakEven,
  type BreakEvenDriver,
  type BudgetLine,
  type EventShape,
  type ExpenseCategory,
  type LineParticipants,
  type LineUnit,
  type RevenueCategory,
} from '../domain/events/economics.ts';
import { formatCurrency, money, type Currency } from '../domain/finance/currency.ts';
import { parseAmountCents } from './money.ts';

export const EVENT_TYPES = ['carnival', 'holiday-clinic', 'tournament', 'other'] as const;
export type EventTypeId = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Readonly<Record<EventTypeId, string>> = {
  carnival: 'Carnival',
  'holiday-clinic': 'Holiday clinic',
  tournament: 'Tournament',
  other: 'Other event',
};

export const EVENT_TYPE_HINT: Readonly<Record<EventTypeId, string>> = {
  carnival: 'One or more days of round-robin games, usually charged per team.',
  'holiday-clinic': 'Coaching over several days of the school holidays, usually charged per participant per day.',
  tournament: 'A competition played to a winner, usually charged per team.',
  other: 'Anything else: a gala day, a trial, a festival.',
};

export const UNIT_LABEL: Readonly<Record<LineUnit, string>> = {
  fixed: 'Once',
  perDay: 'Per day',
  perTeam: 'Per team',
  perParticipant: 'Per participant',
  perParticipantPerDay: 'Per participant per day',
};

export const PARTICIPANTS_LABEL: Readonly<Record<LineParticipants, string>> = {
  all: 'Everyone',
  junior: 'Juniors only',
  senior: 'Seniors only',
};

export const CATEGORY_LABEL: Readonly<Record<RevenueCategory | ExpenseCategory, string>> = {
  'entry-fees': 'Entry fees',
  sponsorship: 'Sponsorship',
  'other-income': 'Other income',
  venue: 'Venue',
  equipment: 'Equipment and kit',
  coaching: 'Coaching',
  referees: 'Referees',
  insurance: 'Insurance',
  marketing: 'Marketing',
  administration: 'Administration',
  sanctioning: 'Governing-body charges',
  other: 'Other costs',
};

/** One line as the visitor is editing it: the amount is what they typed. */
export type LineDraft =
  | {
      readonly id: string;
      readonly label: string;
      readonly direction: 'revenue';
      readonly category: RevenueCategory;
      readonly unit: LineUnit;
      readonly participants: LineParticipants;
      readonly amount: string;
    }
  | {
      readonly id: string;
      readonly label: string;
      readonly direction: 'expense';
      readonly category: ExpenseCategory;
      readonly unit: LineUnit;
      readonly participants: LineParticipants;
      readonly amount: string;
    };

export interface CalculatorState {
  readonly type: EventTypeId;
  readonly currency: Currency;
  readonly driver: BreakEvenDriver;
  readonly days: string;
  readonly teams: string;
  readonly juniors: string;
  readonly seniors: string;
  readonly lines: readonly LineDraft[];
  /** Makes the next added line's id unique within this state. */
  readonly nextId: number;
}

type Preset = readonly [label: string, direction: 'revenue' | 'expense', category: RevenueCategory | ExpenseCategory, unit: LineUnit, participants?: LineParticipants];

const GOVERNING_BODY: readonly Preset[] = [
  ['Governing-body charge — juniors', 'expense', 'sanctioning', 'perParticipant', 'junior'],
  ['Governing-body charge — seniors', 'expense', 'sanctioning', 'perParticipant', 'senior'],
];

const PRESETS: Readonly<Record<EventTypeId, { readonly driver: BreakEvenDriver; readonly lines: readonly Preset[] }>> = {
  carnival: {
    driver: 'teams',
    lines: [
      ['Team entry fees', 'revenue', 'entry-fees', 'perTeam'],
      ['Sponsorship', 'revenue', 'sponsorship', 'fixed'],
      ['Canteen and other income', 'revenue', 'other-income', 'fixed'],
      ['Venue hire', 'expense', 'venue', 'perDay'],
      ['Referees', 'expense', 'referees', 'perTeam'],
      ['First aid', 'expense', 'other', 'perDay'],
      ['Medals and participation gifts', 'expense', 'equipment', 'perParticipant'],
      ['Equipment and field marking', 'expense', 'equipment', 'fixed'],
      ['Insurance', 'expense', 'insurance', 'fixed'],
      ['Marketing', 'expense', 'marketing', 'fixed'],
      ['Administration', 'expense', 'administration', 'fixed'],
      ...GOVERNING_BODY,
    ],
  },
  'holiday-clinic': {
    driver: 'participants',
    lines: [
      ['Participant fees', 'revenue', 'entry-fees', 'perParticipantPerDay'],
      ['Sponsorship', 'revenue', 'sponsorship', 'fixed'],
      ['Venue hire', 'expense', 'venue', 'perDay'],
      ['Coaches', 'expense', 'coaching', 'perDay'],
      ['Equipment', 'expense', 'equipment', 'fixed'],
      ['Participant kit', 'expense', 'equipment', 'perParticipant'],
      ['Insurance', 'expense', 'insurance', 'fixed'],
      ['Marketing', 'expense', 'marketing', 'fixed'],
      ['Administration', 'expense', 'administration', 'fixed'],
      ...GOVERNING_BODY,
    ],
  },
  tournament: {
    driver: 'teams',
    lines: [
      ['Team entry fees', 'revenue', 'entry-fees', 'perTeam'],
      ['Sponsorship', 'revenue', 'sponsorship', 'fixed'],
      ['Other income', 'revenue', 'other-income', 'fixed'],
      ['Venue hire', 'expense', 'venue', 'perDay'],
      ['Referees', 'expense', 'referees', 'perTeam'],
      ['First aid', 'expense', 'other', 'perDay'],
      ['Trophies and medals', 'expense', 'equipment', 'fixed'],
      ['Insurance', 'expense', 'insurance', 'fixed'],
      ['Marketing', 'expense', 'marketing', 'fixed'],
      ['Administration', 'expense', 'administration', 'fixed'],
      ...GOVERNING_BODY,
    ],
  },
  other: {
    driver: 'participants',
    lines: [
      ['Participant fees', 'revenue', 'entry-fees', 'perParticipant'],
      ['Sponsorship', 'revenue', 'sponsorship', 'fixed'],
      ['Venue hire', 'expense', 'venue', 'perDay'],
      ['Other costs', 'expense', 'other', 'fixed'],
      ['Governing-body charge', 'expense', 'sanctioning', 'perParticipant'],
    ],
  },
};

function draft(id: string, [label, direction, category, unit, participants = 'all']: Preset): LineDraft {
  return direction === 'revenue'
    ? { id, label, direction, category: category as RevenueCategory, unit, participants, amount: '' }
    : { id, label, direction, category: category as ExpenseCategory, unit, participants, amount: '' };
}

/** A fresh calculator for an event type: its usual lines, every amount blank. */
export function initialState(type: EventTypeId, currency: Currency = 'AUD'): CalculatorState {
  const preset = PRESETS[type];
  return {
    type,
    currency,
    driver: preset.driver,
    days: '1',
    teams: '',
    juniors: '',
    seniors: '',
    lines: preset.lines.map((p, i) => draft(`${type}-${i}`, p)),
    nextId: preset.lines.length,
  };
}

export function addLine(state: CalculatorState, direction: 'revenue' | 'expense'): CalculatorState {
  const line =
    direction === 'revenue'
      ? draft(`${state.type}-${state.nextId}`, ['Other income', 'revenue', 'other-income', 'fixed'])
      : draft(`${state.type}-${state.nextId}`, ['Other cost', 'expense', 'other', 'fixed']);
  return { ...state, lines: [...state.lines, line], nextId: state.nextId + 1 };
}

export function updateLine(
  state: CalculatorState,
  id: string,
  patch: Partial<Pick<LineDraft, 'label' | 'unit' | 'participants' | 'amount'>>,
): CalculatorState {
  return { ...state, lines: state.lines.map((l) => (l.id === id ? ({ ...l, ...patch } as LineDraft) : l)) };
}

export function removeLine(state: CalculatorState, id: string): CalculatorState {
  return { ...state, lines: state.lines.filter((l) => l.id !== id) };
}

export const isPerParticipantUnit = (unit: LineUnit): boolean =>
  unit === 'perParticipant' || unit === 'perParticipantPerDay';

/** Beyond these the calculator is not the right tool, and the integers stay safe. */
const LIMITS = { days: 60, teams: 1000, people: 100_000, amountCents: 1_000_000_000 } as const;

export type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

/** A count as typed: blank is zero, anything but a whole number is refused. */
export function parseCount(input: string, max: number): Parsed<number> {
  const raw = input.trim();
  if (raw === '') return { ok: true, value: 0 };
  if (!/^\d+$/.test(raw)) return { ok: false, error: 'Enter a whole number, like 12.' };
  const value = Number(raw);
  if (value > max) return { ok: false, error: `Enter ${max.toLocaleString('en-AU')} or fewer.` };
  return { ok: true, value };
}

/**
 * An amount as typed: blank is nothing yet, `A$`, `NZ$` and `$` are
 * allowed in front, and a negative is refused — an amount here is a price
 * or a cost, and a refund is not something an estimate plans for.
 */
export function parseLineAmount(input: string): Parsed<number> {
  const raw = input.trim().replace(/^(A|NZ)(?=\$)/i, '');
  if (raw === '') return { ok: true, value: 0 };
  const parsed = parseAmountCents(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (parsed.cents < 0) return { ok: false, error: 'Enter zero or more.' };
  if (parsed.cents > LIMITS.amountCents) return { ok: false, error: 'That is more than this calculator handles.' };
  return { ok: true, value: parsed.cents };
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-AU')} ${n === 1 ? one : many}`;

function headcountWords(shape: EventShape, who: LineParticipants): string {
  if (who === 'junior') return plural(shape.juniors, 'junior', 'juniors');
  if (who === 'senior') return plural(shape.seniors, 'senior', 'seniors');
  return plural(shape.juniors + shape.seniors, 'participant', 'participants');
}

/** How a line's total was made, in words: "× 30 participants × 3 days". */
export function lineWorking(line: Pick<BudgetLine, 'unit' | 'participants'>, shape: EventShape): string {
  switch (line.unit) {
    case 'fixed':
      return 'once';
    case 'perDay':
      return `× ${plural(shape.days, 'day', 'days')}`;
    case 'perTeam':
      return `× ${plural(shape.teams, 'team', 'teams')}`;
    case 'perParticipant':
      return `× ${headcountWords(shape, line.participants)}`;
    case 'perParticipantPerDay':
      return `× ${headcountWords(shape, line.participants)} × ${plural(shape.days, 'day', 'days')}`;
  }
}

/** The break-even, said in words a committee would use. */
export function breakEvenSentence(be: BreakEven, shape: EventShape, mixed: boolean): string {
  const unit = be.driver === 'teams' ? ['team', 'teams'] : ['participant', 'participants'];
  switch (be.kind) {
    case 'needs-shape':
      return be.missing === 'teams'
        ? 'Enter the number of teams to see where it breaks even.'
        : 'Enter how many juniors and seniors to see where it breaks even.';
    case 'not-reachable':
      return `It can’t break even by growing: each extra ${unit[0]} costs at least what it brings in. Raise the fee, or cut a cost that rises with each ${unit[0]}.`;
    case 'reached': {
      if (be.count === 0) return 'Fixed income already covers fixed costs, so it breaks even before the first entry.';
      const entered = be.driver === 'teams' ? shape.teams : shape.juniors + shape.seniors;
      const condition =
        be.driver === 'teams'
          ? ', each bringing as many players as you entered'
          : mixed
            ? ', with juniors and seniors in the proportion you entered'
            : '';
      const versus =
        entered === 0
          ? ''
          : entered >= be.count
            ? ` You have entered ${plural(entered, unit[0] as string, unit[1] as string)}.`
            : ` You have entered ${plural(entered, unit[0] as string, unit[1] as string)}: ${plural(be.count - entered, unit[0] as string, unit[1] as string)} short.`;
      return `Breaks even at ${plural(be.count, unit[0] as string, unit[1] as string)}${condition}.${versus}`;
    }
  }
}

export interface CategoryRow {
  readonly label: string;
  readonly amount: string;
  /** Of its own side's total, 0–100, for a bar. */
  readonly percent: number;
}

export interface ScenarioRow {
  readonly label: string;
  readonly size: string;
  readonly income: string;
  readonly costs: string;
  readonly result: string;
  readonly deficit: boolean;
}

export type CalculatorView =
  | { readonly ok: false; readonly errors: Readonly<Record<string, string>> }
  | {
      readonly ok: true;
      readonly income: string;
      readonly costs: string;
      readonly result: string;
      readonly resultKind: 'surplus' | 'deficit' | 'even';
      readonly perParticipant: { readonly income: string; readonly cost: string } | null;
      readonly breakEven: string;
      readonly incomeRows: readonly CategoryRow[];
      readonly costRows: readonly CategoryRow[];
      /** Each line's total and how it was made, by line id. */
      readonly lines: Readonly<Record<string, { readonly total: string; readonly working: string }>>;
      readonly scenarios: readonly ScenarioRow[];
      readonly hasGoverningBodyCharge: boolean;
    };

function rows<C extends string>(items: readonly { category: C; cents: number }[], total: number, currency: Currency): CategoryRow[] {
  return items.map((c) => ({
    label: CATEGORY_LABEL[c.category as RevenueCategory | ExpenseCategory],
    amount: formatCurrency(money(c.cents, currency)),
    percent: total === 0 ? 0 : Math.round((c.cents / total) * 100),
  }));
}

function sizeWords(shape: EventShape, driver: BreakEvenDriver): string {
  const people = plural(shape.juniors + shape.seniors, 'participant', 'participants');
  return driver === 'teams' ? `${plural(shape.teams, 'team', 'teams')}, ${people}` : people;
}

/**
 * Everything the page shows, from what the visitor typed. Every line is the
 * visitor's own figure, so every figure is an assumption (BR208), and the
 * page says so once rather than on every number.
 */
export function calculatorView(state: CalculatorState): CalculatorView {
  const errors: Record<string, string> = {};
  const count = (key: 'days' | 'teams' | 'juniors' | 'seniors', max: number): number => {
    const r = parseCount(state[key], max);
    if (!r.ok) errors[key] = r.error;
    return r.ok ? r.value : 0;
  };
  const shape: EventShape = {
    days: count('days', LIMITS.days),
    teams: count('teams', LIMITS.teams),
    juniors: count('juniors', LIMITS.people),
    seniors: count('seniors', LIMITS.people),
  };
  const lines: BudgetLine[] = [];
  for (const d of state.lines) {
    const amount = parseLineAmount(d.amount);
    if (!amount.ok) {
      errors[d.id] = amount.error;
      continue;
    }
    const participants = isPerParticipantUnit(d.unit) ? d.participants : 'all';
    lines.push(
      d.direction === 'revenue'
        ? { label: d.label, direction: 'revenue', category: d.category, unit: d.unit, participants, amountCents: amount.value, basis: 'assumption' }
        : { label: d.label, direction: 'expense', category: d.category, unit: d.unit, participants, amountCents: amount.value, basis: 'assumption' },
    );
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const f = eventEconomics(lines, shape, state.driver, state.currency);
  const fmt = (cents: number) => formatCurrency(money(cents, state.currency));
  const mixed = lines.some((l) => isPerParticipantUnit(l.unit) && l.participants !== 'all' && l.amountCents > 0);

  const scenario = (label: string, percent: number): ScenarioRow => {
    const s = percent === 0 ? shape : scaleShape(shape, state.driver, percent);
    const g = percent === 0 ? f : eventEconomics(lines, s, state.driver, state.currency);
    return {
      label,
      size: sizeWords(s, state.driver),
      income: fmt(g.revenueCents),
      costs: fmt(g.costCents),
      result: fmt(g.surplusCents),
      deficit: g.surplusCents < 0,
    };
  };
  const driverWord = state.driver === 'teams' ? 'teams' : 'participants';

  return {
    ok: true,
    income: fmt(f.revenueCents),
    costs: fmt(f.costCents),
    result: fmt(Math.abs(f.surplusCents)),
    resultKind: f.surplusCents > 0 ? 'surplus' : f.surplusCents < 0 ? 'deficit' : 'even',
    perParticipant: f.perParticipant === null ? null : { income: fmt(f.perParticipant.revenueCents), cost: fmt(f.perParticipant.costCents) },
    breakEven: breakEvenSentence(f.breakEven, shape, mixed),
    incomeRows: rows(f.revenueByCategory, f.revenueCents, state.currency),
    costRows: rows(f.costByCategory, f.costCents, state.currency),
    lines: Object.fromEntries(
      state.lines.map((d, i) => {
        const l = lines[i] as BudgetLine;
        return [d.id, { total: fmt(f.lineTotals[i] ?? 0), working: lineWorking(l, shape) }];
      }),
    ),
    scenarios: [scenario(`20% fewer ${driverWord}`, -20), scenario('As entered', 0), scenario(`20% more ${driverWord}`, 20)],
    hasGoverningBodyCharge: lines.some((l) => l.category === 'sanctioning'),
  };
}
