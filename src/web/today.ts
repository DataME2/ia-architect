/**
 * What day it is, in the club's timezone.
 *
 * Not incidental. Minority (BR1), the transfer of authority at 18 (BR67),
 * and clearance coverage against the season end (BR54) are all decided by
 * comparing dates — and a server in UTC is already tomorrow while Brisbane
 * is still yesterday evening. Getting this wrong makes a child an adult a
 * day early, which is exactly the kind of quiet, occasional error nobody
 * traces back to a timezone.
 */
import type { IsoDate } from '../domain/types.ts';

/** The pilot club is in Brisbane, which does not observe daylight saving. */
export const DEFAULT_TIME_ZONE = 'Australia/Brisbane';

/**
 * `YYYY-MM-DD` for `now` as seen in `timeZone`.
 *
 * `now` is injected so the boundary is testable rather than dependent on
 * when the suite happens to run.
 */
export function todayIn(timeZone: string = DEFAULT_TIME_ZONE, now: Date = new Date()): IsoDate {
  // `en-CA` formats as YYYY-MM-DD, which is the ISO form we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * The ISO 8601 week `day` falls in (scope 110): Monday to Sunday, and week 1
 * is the one holding the year's first Thursday, as Australian calendars and
 * fixture lists number them. So the last days of December can be week 1,
 * and a year can have a week 53.
 */
export function isoWeek(day: IsoDate): { readonly week: number; readonly monday: Date; readonly sunday: Date } {
  const date = new Date(`${day}T00:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const daysIn = (thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / 86_400_000;
  return { week: 1 + Math.floor(daysIn / 7), monday, sunday };
}

/** `Week 43 · 19–25 Oct`, or `Week 40 · 28 Sep – 4 Oct` across a month. */
export function weekLabel(day: IsoDate): string {
  const { week, monday, sunday } = isoWeek(day);
  const end = `${sunday.getUTCDate()} ${MONTHS[sunday.getUTCMonth()]}`;
  const start =
    monday.getUTCMonth() === sunday.getUTCMonth()
      ? `${monday.getUTCDate()}–`
      : `${monday.getUTCDate()} ${MONTHS[monday.getUTCMonth()]} – `;
  return `Week ${week} · ${start}${end}`;
}
