/**
 * How a coordinator reads and writes an official's availability.
 *
 * Pure, so the awkward parts — a window that wraps nothing, two windows
 * that overlap, a range that has already passed — are testable without a
 * database or a browser.
 *
 * **Weekday 0 is Sunday**, matching Postgres' own `extract(dow)`. Choosing
 * a different convention here would mean translating on every read and
 * getting it wrong once.
 */

export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface AvailabilityWindow {
  readonly id: string;
  readonly weekday: number;
  /** `HH:MM` or `HH:MM:SS`, or null for the whole day. */
  readonly fromTime: string | null;
  readonly toTime: string | null;
  readonly note: string | null;
}

export interface UnavailabilityRange {
  readonly id: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly reason: string | null;
}

/** `09:00:00` → `09:00`. Seconds are noise on a match sheet. */
export function shortTime(value: string | null): string | null {
  if (value === null) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match === null ? value : `${match[1]}:${match[2]}`;
}

/** `Saturdays, 08:00–12:00` · `Sundays, all day`. */
export function windowLabel(w: AvailabilityWindow): string {
  const day = `${WEEKDAYS[w.weekday] ?? 'Unknown day'}s`;
  const from = shortTime(w.fromTime);
  const to = shortTime(w.toTime);

  if (from === null && to === null) return `${day}, all day`;
  if (from !== null && to === null) return `${day}, from ${from}`;
  if (from === null && to !== null) return `${day}, until ${to}`;
  return `${day}, ${from}–${to}`;
}

/**
 * Whether two windows on the same day describe overlapping time.
 *
 * Not refused — the database allows it and the availability answer is a
 * union, so two overlapping windows are harmless. But they are almost
 * always a mistake somebody made while editing, and a coordinator reading
 * "Saturdays 08:00–12:00" and "Saturdays 10:00–14:00" cannot tell which one
 * they meant to change. So the screen says so and leaves it to them.
 */
export function overlaps(a: AvailabilityWindow, b: AvailabilityWindow): boolean {
  if (a.weekday !== b.weekday) return false;

  const start = (w: AvailabilityWindow) => shortTime(w.fromTime) ?? '00:00';
  const end = (w: AvailabilityWindow) => shortTime(w.toTime) ?? '23:59';

  return start(a) <= end(b) && start(b) <= end(a);
}

/** Pairs of windows that overlap, so the screen can name them. */
export function overlappingPairs(
  windows: readonly AvailabilityWindow[],
): readonly (readonly [AvailabilityWindow, AvailabilityWindow])[] {
  const pairs: (readonly [AvailabilityWindow, AvailabilityWindow])[] = [];
  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i]!;
      const b = windows[j]!;
      if (overlaps(a, b)) pairs.push([a, b]);
    }
  }
  return pairs;
}

/** Windows in the order a week runs, then by start time. */
export function orderWindows(
  windows: readonly AvailabilityWindow[],
): readonly AvailabilityWindow[] {
  return [...windows].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return (shortTime(a.fromTime) ?? '00:00').localeCompare(shortTime(b.fromTime) ?? '00:00');
  });
}

export type RangeState = 'past' | 'current' | 'future';

/**
 * Where a range sits relative to a date.
 *
 * A past unavailability is kept rather than deleted — "why was nobody
 * available that weekend" is a question asked afterwards — but it should
 * not read like a current one.
 */
export function rangeState(range: UnavailabilityRange, asOf: string): RangeState {
  if (range.endsOn < asOf) return 'past';
  if (range.startsOn > asOf) return 'future';
  return 'current';
}

/** `1 – 31 July 2026`, or a single date where they are the same. */
export function rangeLabel(range: UnavailabilityRange): string {
  return range.startsOn === range.endsOn
    ? range.startsOn
    : `${range.startsOn} – ${range.endsOn}`;
}

/** Current and upcoming first, most recent past last. */
export function orderRanges(
  ranges: readonly UnavailabilityRange[],
  asOf: string,
): readonly UnavailabilityRange[] {
  const rank = (r: UnavailabilityRange) =>
    ({ current: 0, future: 1, past: 2 })[rangeState(r, asOf)];
  return [...ranges].sort((a, b) => {
    const byState = rank(a) - rank(b);
    if (byState !== 0) return byState;
    return rank(a) === 2 ? b.startsOn.localeCompare(a.startsOn) : a.startsOn.localeCompare(b.startsOn);
  });
}

export type WindowProblem =
  | { readonly field: 'weekday'; readonly message: string }
  | { readonly field: 'time'; readonly message: string };

/**
 * What is wrong with a window somebody is trying to declare.
 *
 * The database refuses `to_time <= from_time` with a check constraint; this
 * says the same thing in a sentence, before the round trip. **Half a window
 * is allowed** — "Saturdays from 14:00" is a complete thought, and
 * demanding both ends would make somebody invent one.
 */
export function windowProblem(
  weekday: string,
  fromTime: string,
  toTime: string,
): WindowProblem | null {
  // `Number('')` is 0, which is Sunday — so an empty selection would be
  // read as a real day and silently declare somebody available on Sundays.
  // Matched as text first, for that reason.
  if (!/^[0-6]$/.test(weekday.trim())) {
    return { field: 'weekday', message: 'Choose a day of the week.' };
  }

  const from = fromTime.trim();
  const to = toTime.trim();
  if (from !== '' && to !== '' && to <= from) {
    return {
      field: 'time',
      message: 'The window has to end after it starts.',
    };
  }
  return null;
}

/** What is wrong with an unavailability somebody is trying to record. */
export function rangeProblem(startsOn: string, endsOn: string): string | null {
  const from = startsOn.trim();
  const to = endsOn.trim();
  if (from === '') return 'Enter the first day they are away.';
  if (to === '') return 'Enter the last day they are away.';
  if (to < from) return 'The last day cannot come before the first.';
  return null;
}

/**
 * One line for the roster: what this official has said about their season.
 *
 * **"Nothing declared" is said out loud**, because silence is not
 * availability — an official who has declared nothing will not be offered
 * for any fixture, and a coordinator seeing a blank cell would read it as
 * "no restrictions" rather than "will never appear".
 */
export function availabilitySummary(
  windows: readonly AvailabilityWindow[],
  ranges: readonly UnavailabilityRange[],
  asOf: string,
): string {
  if (windows.length === 0) {
    return 'Nothing declared — they will not be offered for any fixture.';
  }

  const days = orderWindows(windows).map(windowLabel).join('; ');
  const away = ranges.filter((r) => rangeState(r, asOf) !== 'past').length;
  return away === 0 ? days : `${days} · ${away} period${away === 1 ? '' : 's'} away`;
}
