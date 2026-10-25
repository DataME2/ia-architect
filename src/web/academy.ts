/**
 * The academy's decisions (scope 112): training nights, who came, and the
 * minutes each player spent in each position. Pure, so every count on the
 * Academy panels is a unit test rather than a screen somebody eyeballed.
 *
 * Who may write any of it is the database's question (0095); nothing here
 * re-checks a role.
 */
import type { IsoDate } from '../domain/types.ts';
import { LINES, type Line } from './dugout.ts';
import { shortDate } from './me-view.ts';
import { participationBanner } from './participation-answer.ts';

export const POSITION_SHORT: Readonly<Record<Line, string>> = {
  goalkeeper: 'GK',
  defender: 'DEF',
  midfielder: 'MID',
  forward: 'FWD',
};

// ------------------------------------------------------------------ dates

export function addDays(day: IsoDate, n: number): IsoDate {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** Monday to Sunday around `day`: the club's week. */
export function weekOf(day: IsoDate): { readonly from: IsoDate; readonly to: IsoDate } {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  const from = addDays(day, -((weekday + 6) % 7));
  return { from, to: addDays(from, 6) };
}

export type Range = 'day' | 'week' | 'month';

export const RANGES: readonly { readonly key: Range; readonly label: string; readonly meta: string }[] = [
  { key: 'day', label: 'Day', meta: 'TODAY' },
  { key: 'week', label: 'Week', meta: 'THIS WEEK' },
  { key: 'month', label: 'Month', meta: 'THIS MONTH' },
];

/** The Academy tab's range around `today` (scope 113): the day, its week, or its month. */
export function periodOf(today: IsoDate, range: Range): { readonly from: IsoDate; readonly to: IsoDate } {
  if (range === 'day') return { from: today, to: today };
  if (range === 'week') return weekOf(today);
  const first = `${today.slice(0, 8)}01`;
  return { from: first, to: addDays(addDays(first, 32).slice(0, 8) + '01', -1) };
}

/** A range from a query string, falling back to the week. */
export const rangeFrom = (value: string | undefined): Range =>
  value === 'day' || value === 'month' ? value : 'week';

// --------------------------------------------------------- training nights

/** A weekly night is entered at most for a year. */
const MOST_NIGHTS = 53;

export type ParsedNights =
  | {
      readonly ok: true;
      readonly teamId: string;
      readonly dates: readonly IsoDate[];
      readonly startsAt: string;
      readonly endsAt: string | null;
      readonly venue: string | null;
    }
  | { readonly ok: false; readonly message: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** One night, or the same night every week until a date (#114). */
export function parseTrainingNights(fields: {
  readonly teamId?: string | null;
  readonly from?: string | null;
  readonly until?: string | null;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
  readonly venue?: string | null;
}): ParsedNights {
  const teamId = (fields.teamId ?? '').trim();
  if (teamId === '') return { ok: false, message: 'Which team trains?' };
  const from = (fields.from ?? '').trim();
  if (!DATE.test(from)) return { ok: false, message: 'Which date is the first night?' };
  const startsAt = (fields.startsAt ?? '').trim();
  if (!TIME.test(startsAt)) return { ok: false, message: 'What time does training start?' };
  const endsAt = (fields.endsAt ?? '').trim();
  if (endsAt !== '' && (!TIME.test(endsAt) || endsAt <= startsAt)) {
    return { ok: false, message: 'Training has to finish after it starts.' };
  }
  const until = (fields.until ?? '').trim();
  if (until !== '' && (!DATE.test(until) || until < from)) {
    return { ok: false, message: 'The last night has to be on or after the first.' };
  }

  const dates: IsoDate[] = [];
  for (let day = from; day <= (until === '' ? from : until); day = addDays(day, 7)) {
    dates.push(day);
    if (dates.length > MOST_NIGHTS) {
      return { ok: false, message: 'That is more than a year of weekly nights. Enter one season at a time.' };
    }
  }
  const venue = (fields.venue ?? '').trim();
  return { ok: true, teamId, dates, startsAt, endsAt: endsAt === '' ? null : endsAt, venue: venue === '' ? null : venue };
}

/** "Tue 27 Oct · 17:30–19:00 · Main pitch" */
export function nightLabel(night: {
  readonly heldOn: IsoDate;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly venue: string | null;
}): string {
  const time = night.endsAt === null ? night.startsAt : `${night.startsAt}–${night.endsAt}`;
  return [shortDate(night.heldOn), time, night.venue].filter((s) => s !== null).join(' · ');
}

// --------------------------------------------------------------- attendance

export type AttendanceMark = 'present' | 'late' | 'absent';

export const MARK_LABEL: Readonly<Record<AttendanceMark, string>> = {
  present: 'Trained',
  late: 'Late',
  absent: 'Did not train',
};

export interface MarkEntry {
  readonly personId: string;
  readonly mark: AttendanceMark;
  readonly reason: string | null;
}

/**
 * The coach's sheet for one night: `mark:<personId>` and
 * `reason:<personId>` for each player on it. A player left unmarked is
 * left alone, so saving half a sheet never clears the other half.
 */
export function parseAttendanceMarks(
  form: Iterable<readonly [string, string]>,
  playerIds: readonly string[],
): { readonly ok: true; readonly marks: readonly MarkEntry[] } | { readonly ok: false; readonly message: string } {
  const values = new Map(form);
  const marks: MarkEntry[] = [];
  for (const personId of playerIds) {
    const mark = (values.get(`mark:${personId}`) ?? '').trim();
    if (mark === '') continue;
    if (mark !== 'present' && mark !== 'late' && mark !== 'absent') {
      return { ok: false, message: 'Trained, late or did not train?' };
    }
    const reason = (values.get(`reason:${personId}`) ?? '').trim().slice(0, 300);
    marks.push({ personId, mark, reason: reason === '' ? null : reason });
  }
  if (marks.length === 0) return { ok: false, message: 'Mark at least one player.' };
  return { ok: true, marks };
}

export interface NightSummary {
  readonly nights: number;
  /** Player answers (BR62): said available, said not. */
  readonly available: number;
  readonly notAvailable: number;
  /** Said nothing yet, for nights still to come: once a night is held, the mark is what counts. */
  readonly noAnswer: number;
  /** The coach's marks, for nights already held. */
  readonly trained: number;
  readonly late: number;
  readonly absent: number;
  readonly unmarked: number;
  /** Player-nights held, which the marks are counted against. */
  readonly expected: number;
  /** Marked as not training, or (unmarked, or still to come) said not available. */
  readonly away: number;
}

/**
 * One team's week. What players said is counted for every night, and who
 * has still to say only for nights to come; marks only for nights on or
 * before `today`, because a night that has not happened has nobody missing
 * from it yet. Cancelled nights count for nothing.
 */
export function summariseNights(input: {
  readonly nights: readonly { readonly id: string; readonly heldOn: IsoDate; readonly cancelled: boolean }[];
  readonly playerIds: readonly string[];
  readonly answers: readonly { readonly sessionId: string; readonly personId: string; readonly available: boolean }[];
  readonly marks: readonly { readonly sessionId: string; readonly personId: string; readonly mark: AttendanceMark }[];
  readonly today: IsoDate;
}): NightSummary {
  const players = new Set(input.playerIds);
  let available = 0;
  let notAvailable = 0;
  let noAnswer = 0;
  let trained = 0;
  let late = 0;
  let absent = 0;
  let unmarked = 0;
  let expected = 0;
  let away = 0;
  const held = input.nights.filter((n) => !n.cancelled);
  for (const night of held) {
    for (const personId of players) {
      const answer = input.answers.find((a) => a.sessionId === night.id && a.personId === personId);
      if (answer !== undefined && answer.available) available += 1;
      else if (answer !== undefined) notAvailable += 1;
      const saidNo = answer !== undefined && !answer.available;

      if (night.heldOn > input.today) {
        if (answer === undefined) noAnswer += 1;
        if (saidNo) away += 1;
        continue;
      }
      expected += 1;
      const mark = input.marks.find((m) => m.sessionId === night.id && m.personId === personId);
      if (mark === undefined) unmarked += 1;
      else if (mark.mark === 'present') trained += 1;
      else if (mark.mark === 'late') late += 1;
      else absent += 1;
      if (mark?.mark === 'absent' || (mark === undefined && saidNo)) away += 1;
    }
  }
  return { nights: held.length, available, notAvailable, noAnswer, trained, late, absent, unmarked, expected, away };
}

/**
 * Why players were away, as they and their coaches wrote it, counted
 * (scope 113). The coach's reason wins over the player's for the same
 * night. Grouped by the words, not into categories nobody chose.
 */
export function awayReasons(input: {
  readonly nights: readonly { readonly id: string; readonly heldOn: IsoDate; readonly cancelled: boolean }[];
  readonly answers: readonly { readonly sessionId: string; readonly personId: string; readonly available: boolean; readonly reason: string | null }[];
  readonly marks: readonly { readonly sessionId: string; readonly personId: string; readonly mark: AttendanceMark; readonly reason: string | null }[];
}): readonly { readonly reason: string; readonly count: number }[] {
  const counted = new Map<string, { reason: string; count: number }>();
  const add = (reason: string | null) => {
    const said = reason?.trim() ?? '';
    if (said === '') return;
    const key = said.toLowerCase();
    const seen = counted.get(key);
    counted.set(key, { reason: seen?.reason ?? said, count: (seen?.count ?? 0) + 1 });
  };
  const nights = new Set(input.nights.filter((n) => !n.cancelled).map((n) => n.id));
  const key = (x: { readonly sessionId: string; readonly personId: string }) => `${x.sessionId}:${x.personId}`;
  const answerOf = new Map(input.answers.map((a) => [key(a), a] as const));
  // A night the coach has marked is decided by the mark, whatever was said before.
  const marked = new Set<string>();
  for (const m of input.marks) {
    if (!nights.has(m.sessionId)) continue;
    marked.add(key(m));
    if (m.mark === 'absent') add(m.reason ?? answerOf.get(key(m))?.reason ?? null);
  }
  for (const a of input.answers) {
    if (!nights.has(a.sessionId) || a.available || marked.has(key(a))) continue;
    add(a.reason);
  }
  return [...counted.values()].sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

/**
 * What a player said about a night, on the coach's sheet. Before the night
 * a missing answer is still awaited; after it, nobody is waiting for one,
 * and the coach's mark says whether they came.
 */
export function saidLabel(
  answer: { readonly available: boolean; readonly reason: string | null } | null,
  held: boolean,
): { readonly label: string; readonly className: string } {
  if (answer === null && held) return { label: 'Didn’t say', className: 'pill' };
  return participationBanner(
    answer === null ? null : { status: answer.available ? 'available' : 'not_available', reason: answer.reason },
  );
}

// ---------------------------------------------------------------- game time

export interface GameTimeRow {
  readonly personId: string;
  readonly started: boolean;
  readonly positions: Readonly<Partial<Record<Line, number>>>;
}

export function totalMinutes(row: Pick<GameTimeRow, 'positions'>): number {
  return LINES.reduce((sum, p) => sum + (row.positions[p] ?? 0), 0);
}

/**
 * A game's minutes by position, from the after-the-match form or the live
 * tracker (both post `min:<personId>:<position>` and `started:<personId>`).
 * A player with no minutes did not play and is left out.
 */
export function parseGameTime(
  form: Iterable<readonly [string, string]>,
  playerIds: readonly string[],
): { readonly ok: true; readonly rows: readonly GameTimeRow[] } | { readonly ok: false; readonly message: string } {
  const values = new Map(form);
  const rows: GameTimeRow[] = [];
  for (const personId of playerIds) {
    const positions: Partial<Record<Line, number>> = {};
    for (const p of LINES) {
      const raw = (values.get(`min:${personId}:${p}`) ?? '').trim();
      if (raw === '' || raw === '0') continue;
      const minutes = Number(raw);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 200) {
        return { ok: false, message: 'Minutes are whole numbers from 0 to 200.' };
      }
      positions[p] = minutes;
    }
    const row = { personId, started: values.get(`started:${personId}`) === 'on', positions };
    if (totalMinutes(row) > 200) return { ok: false, message: 'No player plays more than 200 minutes in one game.' };
    if (totalMinutes(row) > 0) rows.push(row);
  }
  if (rows.length === 0) return { ok: false, message: 'Nobody has any minutes yet.' };
  return { ok: true, rows };
}

export interface PlayerMinutes {
  readonly personId: string;
  readonly total: number;
  readonly byPosition: Readonly<Record<Line, number>>;
  /** Minutes recorded before positions were, or without them (BR102's honesty). */
  readonly unplaced: number;
}

/** A season's minutes per player, split by position, most minutes first. */
export function minutesByPosition(
  appearances: readonly {
    readonly personId: string;
    readonly minutes: number;
    readonly positions: readonly { readonly position: Line; readonly minutes: number }[];
  }[],
): readonly PlayerMinutes[] {
  const byPerson = new Map<string, { total: number; byPosition: Record<Line, number>; unplaced: number }>();
  for (const a of appearances) {
    const entry = byPerson.get(a.personId) ?? {
      total: 0,
      byPosition: { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 },
      unplaced: 0,
    };
    entry.total += a.minutes;
    let placed = 0;
    for (const p of a.positions) {
      entry.byPosition[p.position] += p.minutes;
      placed += p.minutes;
    }
    entry.unplaced += Math.max(0, a.minutes - placed);
    byPerson.set(a.personId, entry);
  }
  return [...byPerson.entries()]
    .map(([personId, e]) => ({ personId, ...e }))
    .sort((a, b) => b.total - a.total);
}
