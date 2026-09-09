/**
 * The decisions behind the person-facing shell (`/me`), kept pure so they
 * are tested by `node --test` and typechecked without a DOM.
 *
 * Nothing here reads a database or renders anything: given fixtures,
 * appearances or a term, it says which one is next, what the season adds up
 * to, and how far past its AGM a committee is.
 */

import type { IsoDate } from '../domain/types.ts';
import type { RoleKey } from './role-context.ts';

/** The fixture fields these decisions need — a subset of the row. */
export interface FixtureLike {
  readonly id: string;
  readonly playedOn: IsoDate;
  readonly opponent: string;
  readonly homeAway: string;
  readonly venue: string | null;
  readonly competition: string | null;
  readonly status: string;
}

/**
 * The next fixture on or after a date — the one a player, a coach or a
 * guardian actually wants to know about. Ties on the date keep the caller's
 * order, so a double-header lists in the order the club entered it.
 */
export function nextFixture<T extends FixtureLike>(fixtures: readonly T[], today: IsoDate): T | null {
  const upcoming = fixtures.filter((f) => f.playedOn >= today && f.status !== 'cancelled');
  if (upcoming.length === 0) return null;
  return upcoming.reduce((soonest, f) => (f.playedOn < soonest.playedOn ? f : soonest));
}

export interface AppearanceLike {
  readonly minutesPlayed: number;
  readonly goals: number;
  readonly assists: number;
}

export interface SeasonFigures {
  readonly appearances: number;
  readonly minutes: number;
  readonly goals: number;
  readonly assists: number;
}

/** Counts rather than events — scope 30's line, drawn again here. */
export function seasonFigures(appearances: readonly AppearanceLike[]): SeasonFigures {
  return appearances.reduce<SeasonFigures>(
    (acc, a) => ({
      appearances: acc.appearances + 1,
      minutes: acc.minutes + a.minutesPlayed,
      goals: acc.goals + a.goals,
      assists: acc.assists + a.assists,
    }),
    { appearances: 0, minutes: 0, goals: 0, assists: 0 },
  );
}

/**
 * Two initials for the avatar, from whatever name the person goes by.
 * A single-word name gives one letter rather than a fabricated second.
 */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * A hue per role, used only as an accent on the active chip and the
 * acting-as swatch.
 *
 * Deliberately **not** the status palette: these say *which lens*, and
 * nothing here may be mistaken for ready / waiting / blocked. Desert orange
 * is absent because it belongs to the Assistant and to nobody else.
 */
export const ROLE_HUE: Readonly<Record<RoleKey, string>> = {
  player: '#7fb08c',
  coach: '#e0b071',
  referee: '#8fc7dd',
  guardian: '#d9a08a',
  committee: '#b0a4c9',
};

/** "for Tané" / "for Tané and Mia" / "for 3 children" — the guardian's scope. */
export function guardianScope(childNames: readonly string[]): string | null {
  if (childNames.length === 0) return null;
  if (childNames.length === 1) return `for ${childNames[0]}`;
  if (childNames.length === 2) return `for ${childNames[0]} and ${childNames[1]}`;
  return `for ${childNames.length} children`;
}

/**
 * "Sat 12 Sep" — the way a fixture list is read out at a club.
 *
 * Fixed tables rather than `toLocaleDateString`: ICU's en-AU gives "Sept"
 * on some Node builds and "Sep" on others, and a pure helper whose output
 * depends on which machine ran it is not pure.
 */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export function shortDate(iso: IsoDate): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined || Number.isNaN(y + m + d)) return iso;
  const month = MONTHS[m - 1];
  if (month === undefined) return iso;
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? '';
  return `${weekday} ${d} ${month}`;
}
