/**
 * What the finance report decides (scope 133), so the page only draws it.
 *
 * Every season reads the same way whether it was imported or is live
 * (`app_finance_report`, migration 0102): billed, collected, outstanding,
 * what the bills were made of, when they went out, and each team's share.
 * Money stays in cents; only these functions turn it into words.
 */
export type Category = 'club' | 'governing' | 'levy' | 'adjustment' | 'discount';

export interface FinanceTeam {
  readonly team: string;
  readonly category: string | null;
  readonly players: number;
  readonly invoiced: number;
  readonly collected: number;
  readonly outstanding: number;
}

export interface FinanceSeason {
  readonly id: string;
  readonly name: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly imported: boolean;
  readonly invoiced: number;
  readonly collected: number;
  readonly outstanding: number;
  readonly credits: number;
  readonly bills: number;
  readonly owing: number;
  readonly components: Partial<Record<Category, number>>;
  readonly months: readonly { readonly month: string; readonly cents: number; readonly count: number }[];
  readonly teams: readonly FinanceTeam[];
}

export interface FinanceReport {
  readonly computedAt: string;
  readonly seasons: readonly FinanceSeason[];
}

export interface FinanceBill {
  readonly id: string;
  readonly imported: boolean;
  readonly reference: string | null;
  readonly billedOn: string;
  readonly payer: string | null;
  readonly invoiced: number;
  readonly paid: number;
  readonly outstanding: number;
  readonly credits: number;
  readonly payments: number;
  readonly lastPaidOn: string | null;
  readonly players: readonly { readonly name: string; readonly team: string }[];
  readonly lines: readonly { readonly category: Category; readonly description: string; readonly cents: number; readonly player: string | null }[];
}

export interface BillsPage {
  readonly total: number;
  readonly rows: readonly FinanceBill[];
}

export const BILLS_PER_PAGE = 25;

export const CATEGORY_LABEL: Readonly<Record<Category, string>> = {
  club: 'Club fees',
  governing: 'Governing body fees',
  levy: 'Levies',
  adjustment: 'Adjustments',
  discount: 'Sibling discounts',
};

/** The chosen season, else the latest that billed anything, else the latest. */
export function pickSeason(seasons: readonly FinanceSeason[], id: string | undefined): FinanceSeason | null {
  return seasons.find((s) => s.id === id)
    ?? [...seasons].reverse().find((s) => s.bills > 0)
    ?? seasons.at(-1)
    ?? null;
}

/** The season before this one, by start date, that billed anything. */
export function previousSeason(seasons: readonly FinanceSeason[], season: FinanceSeason): FinanceSeason | null {
  return [...seasons]
    .filter((s) => s.startsOn < season.startsOn && s.bills > 0)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0] ?? null;
}

/** Collected as a share of billed, or null when nothing was billed. */
export function collectionRate(collected: number, invoiced: number): number | null {
  return invoiced > 0 ? collected / invoiced : null;
}

export function percent(share: number | null): string {
  return share === null ? '—' : `${(share * 100).toFixed(1)}%`;
}

/**
 * A change on the previous season, signed and named. `upIsGood` says which
 * way is the good news: more collected is, more outstanding is not.
 */
export function delta(
  now: number,
  before: number | null,
  upIsGood: boolean,
): { readonly text: string; readonly tone: 'good' | 'bad' | 'flat' } | null {
  if (before === null || before === 0) return null;
  const change = (now - before) / before;
  if (Math.abs(change) < 0.0005) return { text: 'no change', tone: 'flat' };
  const up = change > 0;
  return { text: `${up ? '+' : '−'}${Math.abs(change * 100).toFixed(1)}%`, tone: up === upIsGood ? 'good' : 'bad' };
}

/** $970, $12.5K, $1.2M: for an axis or a bar's end, never a total someone reconciles. */
export function compactCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '−' : '';
  if (dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (dollars >= 100_000) return `${sign}$${Math.round(dollars / 1000)}K`;
  if (dollars >= 1000) return `${sign}$${(dollars / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sign}$${Math.round(dollars)}`;
}

const AUD = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

/** $686,751.00: a season's totals are read across a room, so they carry separators. */
export function money(cents: number): string {
  return AUD.format(cents / 100);
}

/** "2025-10" → "Oct 2025". */
export function monthLabel(month: string): string {
  const [y = 1970, m = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Round axis stops from zero to at least `max`: 1, 2 or 5 times a power of ten apart. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((k) => k * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let t = 0; t < max + step; t += step) ticks.push(t);
  return ticks;
}

/** Each season's bar: collected and outstanding as shares of the widest season's bill. */
export function seasonBars(seasons: readonly FinanceSeason[]) {
  const widest = Math.max(1, ...seasons.map((s) => s.collected + s.outstanding));
  return seasons.map((s) => ({
    season: s,
    collectedPct: (100 * s.collected) / widest,
    outstandingPct: (100 * s.outstanding) / widest,
  }));
}

/**
 * What the season's bills were made of: largest charge first, the sibling
 * discount last, as the one line that takes money off. Each bar is a share
 * of the largest line, so the discount reads against what it reduced.
 */
export function componentRows(components: Partial<Record<Category, number>>) {
  const rows = (Object.keys(CATEGORY_LABEL) as Category[])
    .map((key) => ({ key, label: CATEGORY_LABEL[key], cents: components[key] ?? 0 }))
    .filter((r) => r.cents !== 0);
  const largest = Math.max(1, ...rows.map((r) => Math.abs(r.cents)));
  return rows
    .sort((a, b) => (a.cents < 0 ? 1 : 0) - (b.cents < 0 ? 1 : 0) || b.cents - a.cents)
    .map((r) => ({ ...r, reduces: r.cents < 0, pct: (100 * Math.abs(r.cents)) / largest }));
}

/** The season's months in order, each column a share of the axis's top stop. */
export function monthColumns(months: FinanceSeason['months']) {
  const ticks = niceTicks(Math.max(0, ...months.map((m) => m.cents)));
  const top = ticks.at(-1) ?? 1;
  return {
    ticks,
    columns: months.map((m) => ({ ...m, label: monthLabel(m.month), heightPct: top > 0 ? (100 * m.cents) / top : 0 })),
  };
}

export type TeamSort = 'team' | 'players' | 'invoiced' | 'collected' | 'outstanding' | 'rate';

export function parseTeamSort(raw: string | undefined): TeamSort {
  return (['team', 'players', 'invoiced', 'collected', 'outstanding', 'rate'] as const).find((k) => k === raw) ?? 'outstanding';
}

/** Teams by the chosen column: names A to Z, every figure largest first, "No team" always last. */
export function sortTeams(teams: readonly FinanceTeam[], by: TeamSort): FinanceTeam[] {
  const value = (t: FinanceTeam): number =>
    by === 'rate' ? collectionRate(t.collected, t.invoiced) ?? -1 : by === 'team' ? 0 : t[by];
  return [...teams].sort((a, b) =>
    (a.team === 'No team' ? 1 : 0) - (b.team === 'No team' ? 1 : 0)
    || (by === 'team' ? a.team.localeCompare(b.team) : value(b) - value(a) || a.team.localeCompare(b.team)));
}

/** The page of bills a `page` query asks for, within what exists. */
export function billsPage(raw: string | undefined, total: number): number {
  const last = Math.max(1, Math.ceil(total / BILLS_PER_PAGE));
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), last) : 1;
}
