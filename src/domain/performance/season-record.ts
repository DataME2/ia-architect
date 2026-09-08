import type { Appearance, SeasonRecord } from './types.ts';

/**
 * A player's season, added up.
 *
 * Deliberately only addition. Per-90 rates are the obvious next step and
 * they are wrong here: a MiniRoos match is 40 minutes and a senior one is
 * 90, so a rate computed per 90 flatters everybody in the shorter format
 * and the two are then compared. Rates arrive when the fixture knows its
 * format, not before.
 */
export function seasonRecord(appearances: readonly Appearance[]): SeasonRecord {
  let starts = 0;
  let minutesPlayed = 0;
  let goals = 0;
  let assists = 0;

  for (const a of appearances) {
    if (a.started) starts += 1;
    minutesPlayed += a.minutesPlayed;
    goals += a.goals;
    assists += a.assists;
  }

  return {
    appearances: appearances.length,
    starts,
    substituteAppearances: appearances.length - starts,
    minutesPlayed,
    goals,
    assists,
    goalContributions: goals + assists,
  };
}

/**
 * Whether a player was named but never got on.
 *
 * Zero minutes across several appearances is the kind of thing a coach
 * should see stated rather than have to notice, and it reads identically to
 * "nobody filled in the minutes" — so the two are distinguished by whether
 * anything was recorded at all.
 */
export function unusedSubstitute(appearances: readonly Appearance[]): boolean {
  return appearances.length > 0 && appearances.every((a) => a.minutesPlayed === 0);
}

/**
 * The most recent appearances first — a season record is read backwards
 * from the last game, not forwards from the first.
 */
export function mostRecentFirst(appearances: readonly Appearance[]): readonly Appearance[] {
  return [...appearances].sort((a, b) => b.playedOn.localeCompare(a.playedOn));
}
