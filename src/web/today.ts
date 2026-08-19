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
