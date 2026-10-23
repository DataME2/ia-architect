/**
 * A governing body's published season calendar, read month by month
 * (scope 101, BR178).
 *
 * **A plan of weekends, not a fixture list.** The calendar says which round
 * of which competition falls on which weekend; it names no teams, venues or
 * kick-offs. Those arrive later as a club's own Matches (scope 99), so this
 * module never pretends to know them.
 *
 * **Weekends belong to the month their Friday is in**, as the governing
 * body's grid has them ("Weekend Commencing Friday"): Friday 30 April's
 * weekend is April's, even though its Sunday is in May.
 *
 * **Shown as published, never corrected.** A cell is read, not adjusted; the
 * page carries the publisher's own "subject to change" (BR178).
 */

export type Group =
  | 'seniors'
  | 'advanced-juniors'
  | 'community-seniors'
  | 'community-juniors'
  | 'miniroos'
  | 'social';

export const GROUPS: readonly { readonly id: Group; readonly label: string }[] = [
  { id: 'seniors', label: 'Seniors' },
  { id: 'advanced-juniors', label: 'Advanced Juniors' },
  { id: 'community-seniors', label: 'Community Seniors' },
  { id: 'community-juniors', label: 'Community Juniors' },
  { id: 'miniroos', label: 'MiniRoos & U12' },
  { id: 'social', label: 'Social, schools & representative' },
];

export interface SeasonCompetition {
  readonly id: string;
  readonly name: string;
  readonly group: Group;
  readonly notes?: string;
  /** Friday (ISO date) → the cell as printed. */
  readonly plan: Readonly<Record<string, string>>;
  /**
   * Played on this weekday of the week, not on the weekend: South Coast's
   * community seniors are printed "Commencing Wednesday", under the
   * Wednesday before each Friday column (scope 103). The plan stays keyed by
   * the Friday, so the grid lines up; `playDate` gives the printed day.
   */
  readonly playedOn?: 'Wednesday';
}

export interface SeasonWindow {
  readonly name: string;
  readonly from: string;
  readonly to: string;
  readonly tbc?: boolean;
}

export interface SeasonEvent extends SeasonWindow {
  readonly level: 'Regional' | 'State' | 'National';
  readonly place?: string;
}

export interface SeasonCalendar {
  readonly id: string;
  readonly season: number;
  readonly governingBody: string;
  readonly state: string;
  readonly region: string;
  readonly source: string;
  readonly caveat: string;
  readonly firstFriday: string;
  readonly weekendCount: number;
  readonly schoolHolidays: readonly string[];
  /** Another state's school holidays, where the publisher prints them (South Coast prints NSW's). */
  readonly otherHolidays?: { readonly name: string; readonly fridays: readonly string[] };
  /** Friday → why nothing is played that weekend. */
  readonly noGames: Readonly<Record<string, string>>;
  readonly windows: readonly SeasonWindow[];
  readonly events: readonly SeasonEvent[];
  readonly competitions: readonly SeasonCompetition[];
}

/** How a cell reads: a round, a catch-up, a final, or the paperwork around them. */
export type Kind = 'round' | 'catch-up' | 'finals' | 'play-off' | 'pre-season' | 'admin' | 'event';

export interface Entry {
  readonly kind: Kind;
  /** What a reader is told: "Round 7", "Grand final". */
  readonly text: string;
  /** What fits on a chip: "R7", "GF". */
  readonly short: string;
  /** Played midweek in the week after this weekend, not on it. */
  readonly midweek: boolean;
}

const STAGES: Readonly<Record<string, readonly [Kind, string]>> = {
  CU: ['catch-up', 'Catch-up round'],
  QR: ['finals', 'Qualifying round'],
  R64: ['finals', 'Round of 64'],
  R32: ['finals', 'Round of 32'],
  R16: ['finals', 'Round of 16'],
  QF: ['finals', 'Quarter-final'],
  SF: ['finals', 'Semi-final'],
  PF: ['finals', 'Preliminary final'],
  GF: ['finals', 'Grand final'],
  PO: ['play-off', 'Play-off'],
  PRE: ['pre-season', 'Pre-season'],
  'NOMS OPEN': ['admin', 'Nominations open'],
  'NOMS CLOSE': ['admin', 'Nominations close'],
  DRAW: ['admin', 'Draw released'],
  BOND: ['admin', 'Bond'],
  Event: ['event', 'Themed event round'],
  FoF: ['event', 'Festival of Football — QLD state teams'],
  Carnival: ['event', 'Girls United Junior Carnival'],
  Rep: ['event', 'Representative carnivals & matches'],
};

/**
 * One printed cell as one or two entries. `'3 & 4 (MW)'` is round 3 on the
 * weekend and round 4 midweek, so it is two entries — a reader planning
 * their Saturday should not be told round 4 is on it.
 */
export function readCell(raw: string): readonly Entry[] {
  const cell = raw.trim();
  if (cell === '') return [];
  const midweek = /\(MW\)/.test(cell);
  const bare = cell.replace(/\s*\(MW\)\s*/g, ' ').trim();
  const stage = STAGES[bare];
  if (stage) return [{ kind: stage[0], text: stage[1], short: bare.length > 4 ? stage[1] : bare, midweek }];
  const foundation = /^Foundation (\d)(?:&(\d))?$/.exec(bare);
  if (foundation) {
    const [, a, b] = foundation;
    return [b
      ? { kind: 'pre-season', text: `Foundation rounds ${a} & ${b}`, short: `F${a}–${b}`, midweek: false }
      : { kind: 'pre-season', text: `Foundation round ${a}`, short: `F${a}`, midweek: false }];
  }

  // Rounds: "7", "7&8", "4 & 5", "3 & 4 (MW)", "20(MW)&21".
  const parts = cell.split('&').map((p) => ({ n: Number(p.replace(/\(MW\)/, '').trim()), mw: /\(MW\)/.test(p) }));
  if (parts.every((p) => Number.isInteger(p.n) && p.n > 0)) {
    return [false, true].flatMap((mw) => {
      const ns = parts.filter((p) => p.mw === mw).map((p) => p.n);
      if (ns.length === 0) return [];
      return [{
        kind: 'round' as const,
        text: ns.length === 1 ? `Round ${ns[0]}` : `Rounds ${ns.join(' & ')}`,
        short: `R${ns.join('–')}`,
        midweek: mw,
      }];
    });
  }
  return [{ kind: 'event', text: cell, short: cell, midweek }];
}

const DAY = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function monthLabel(month0: number): string {
  return MONTH_NAMES[month0] ?? '';
}

/** "5 Mar", or "5 Mar 2026" when the year is not the season's. */
export function shortDate(iso: string, season?: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const year = season !== undefined && y !== season ? ` ${y}` : '';
  return `${d} ${MONTHS[(m ?? 1) - 1]}${year}`;
}

/** "Fri 5 – Sun 7 Mar", "Fri 30 Apr – Sun 2 May". */
export function weekendLabel(friday: string): string {
  const sunday = addDays(friday, 2);
  const sameMonth = friday.slice(5, 7) === sunday.slice(5, 7);
  return `Fri ${sameMonth ? Number(friday.slice(8)) : shortDate(friday)} – Sun ${shortDate(sunday)}`;
}

/** "From 5 Mar to 7 Mar", collapsed to one date when both are the same. */
export function spanLabel(w: Pick<SeasonWindow, 'from' | 'to' | 'tbc'>, season: number): string {
  const span = w.from === w.to ? shortDate(w.from, season) : `${shortDate(w.from, season)} – ${shortDate(w.to, season)}`;
  return w.tbc ? `${span} (dates to be confirmed)` : span;
}

export interface Weekend {
  readonly friday: string;
  readonly month0: number;
  readonly label: string;
  readonly schoolHoliday: boolean;
  /** "NSW school holidays", when the calendar prints another state's and this weekend is in them. */
  readonly otherHoliday: string | null;
  readonly noGames: string | null;
}

export function weekendsOf(cal: SeasonCalendar): readonly Weekend[] {
  const holidays = new Set(cal.schoolHolidays);
  const other = new Set(cal.otherHolidays?.fridays ?? []);
  return Array.from({ length: cal.weekendCount }, (_, i) => {
    const friday = addDays(cal.firstFriday, i * 7);
    return {
      friday,
      month0: Number(friday.slice(5, 7)) - 1,
      label: weekendLabel(friday),
      schoolHoliday: holidays.has(friday),
      otherHoliday: other.has(friday) ? (cal.otherHolidays?.name ?? null) : null,
      noGames: cal.noGames[friday] ?? null,
    };
  });
}

export interface Month {
  readonly month0: number;
  readonly label: string;
  readonly weekends: readonly Weekend[];
}

export function monthsOf(cal: SeasonCalendar): readonly Month[] {
  const months: Month[] = [];
  for (const w of weekendsOf(cal)) {
    const last = months.at(-1);
    if (last?.month0 === w.month0) (last.weekends as Weekend[]).push(w);
    else months.push({ month0: w.month0, label: monthLabel(w.month0), weekends: [w] });
  }
  return months;
}

/** The day a competition plays a column: the Friday that keys it, or the Wednesday before it. */
export function playDate(c: SeasonCompetition, friday: string): string {
  return c.playedOn === 'Wednesday' ? addDays(friday, -2) : friday;
}

export interface Slot {
  readonly competition: SeasonCompetition;
  readonly entry: Entry;
}

/** Everything on one weekend, and in the midweek after it, for the chosen groups (null = all). */
export function slotsOn(
  cal: SeasonCalendar,
  friday: string,
  groups: ReadonlySet<Group> | null,
): { readonly weekend: readonly Slot[]; readonly midweek: readonly Slot[] } {
  const slots = cal.competitions
    .filter((c) => groups === null || groups.has(c.group))
    .flatMap((c) => readCell(c.plan[friday] ?? '').map((entry) => ({ competition: c, entry })));
  return { weekend: slots.filter((s) => !s.entry.midweek), midweek: slots.filter((s) => s.entry.midweek) };
}

const PLAYED: ReadonlySet<Kind> = new Set(['round', 'catch-up', 'finals', 'play-off']);

/** How many competitions take the field each weekend (midweek included): the season's pulse. */
export function pulse(cal: SeasonCalendar, groups: ReadonlySet<Group> | null): readonly number[] {
  return weekendsOf(cal).map((w) => {
    const { weekend, midweek } = slotsOn(cal, w.friday, groups);
    return new Set([...weekend, ...midweek].filter((s) => PLAYED.has(s.entry.kind)).map((s) => s.competition.id)).size;
  });
}

export interface Journey {
  readonly firstRound: string | null;
  readonly grandFinal: string | null;
  readonly rounds: number;
  readonly catchUps: number;
  readonly finals: number;
}

/** One competition's season in five facts: when it starts and ends, and how much is in between. */
export function journeyOf(c: SeasonCompetition): Journey {
  const cells = Object.entries(c.plan).sort(([a], [b]) => a.localeCompare(b));
  const entries = cells.flatMap(([friday, raw]) => readCell(raw).map((e) => ({ friday, e })));
  const rounds = entries.filter((x) => x.e.kind === 'round');
  const roundNumbers = rounds.flatMap((x) => x.e.text.match(/\d+/g) ?? []);
  return {
    firstRound: rounds[0]?.friday ?? null,
    grandFinal: entries.find((x) => x.e.short === 'GF')?.friday ?? null,
    rounds: new Set(roundNumbers).size,
    catchUps: entries.filter((x) => x.e.kind === 'catch-up').length,
    finals: entries.filter((x) => x.e.kind === 'finals').length,
  };
}

export interface KeyDate {
  readonly name: string;
  readonly when: string;
  readonly kind: 'window' | SeasonEvent['level'];
  readonly place?: string;
}

/** Carnivals and registration windows that touch a month, earliest first. */
export function keyDatesIn(cal: SeasonCalendar, month0: number): readonly KeyDate[] {
  const prefix = `${cal.season}-${String(month0 + 1).padStart(2, '0')}`;
  const touches = (w: SeasonWindow) => w.from.slice(0, 7) <= prefix && w.to.slice(0, 7) >= prefix;
  const date = (w: SeasonWindow, kind: KeyDate['kind'], place?: string): KeyDate & { from: string } => ({
    name: w.name,
    when: spanLabel(w, cal.season),
    kind,
    from: w.from,
    ...(place ? { place } : {}),
  });
  return [
    ...cal.windows.filter(touches).map((w) => date(w, 'window')),
    ...cal.events.filter(touches).map((e) => date(e, e.level, e.place)),
  ].sort((a, b) => a.from.localeCompare(b.from));
}

/** "QPL 4 Women · 11/12 Teams (TBC)": the notes only where two names collide. */
export function competitionLabel(c: SeasonCompetition, all: readonly SeasonCompetition[]): string {
  const twins = all.filter((o) => o.name === c.name).length > 1;
  return twins && c.notes ? `${c.name} · ${c.notes}` : c.name;
}

export interface SeasonFacts {
  readonly competitions: number;
  readonly weekends: number;
  readonly firstBall: string | null;
  readonly lastFinal: string | null;
}

/** The hero's three numbers: how many competitions, and when the season opens and closes. */
export function seasonFacts(cal: SeasonCalendar): SeasonFacts {
  const journeys = cal.competitions.map(journeyOf);
  const firsts = journeys.flatMap((j) => (j.firstRound ? [j.firstRound] : [])).sort();
  const finals = journeys.flatMap((j) => (j.grandFinal ? [j.grandFinal] : [])).sort();
  return {
    competitions: cal.competitions.length,
    weekends: cal.weekendCount,
    firstBall: firsts[0] ?? null,
    lastFinal: finals.at(-1) ?? null,
  };
}
