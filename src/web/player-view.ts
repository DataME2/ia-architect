import type { PlayerProfile, SeasonRecord } from '../domain/performance/types.ts';

/**
 * The player card's decisions, kept out of the page like every other
 * screen's.
 */

export const POSITION_LABEL: Record<string, string> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  forward: 'Forward',
  utility: 'Utility',
};

export const FOOT_LABEL: Record<string, string> = {
  left: 'Left',
  right: 'Right',
  both: 'Both',
};

/**
 * Height as a club would write it, and null when it is not known.
 *
 * Returning a dash rather than null would make "not recorded" and "recorded
 * as nothing" look the same on the card, and physique is optional by
 * design (BR99) — so absence is the common case and has to read as absence.
 */
export function heightLabel(cm: number | null): string | null {
  if (cm === null) return null;
  return `${cm} cm`;
}

export function weightLabel(kg: number | null): string | null {
  if (kg === null) return null;
  // One decimal: a club weighs a child to the nearest half kilo at most, and
  // 42.00 kg claims a precision nobody measured.
  return `${Number(kg).toFixed(1).replace(/\.0$/, '')} kg`;
}

/** Whether the profile carries anything at all worth a panel. */
export function hasPhysique(profile: PlayerProfile | null): boolean {
  if (profile === null) return false;
  return (
    profile.heightCm !== null ||
    profile.weightKg !== null ||
    profile.preferredPosition !== null ||
    profile.preferredFoot !== null ||
    profile.squadNumber !== null
  );
}

/**
 * How a season record should be described in one line.
 *
 * Written out rather than left as bare numbers because "3 apps, 0 goals"
 * reads as a judgement and "played three times" does not — and at junior
 * level the difference matters more than the saving.
 */
export function recordSummary(record: SeasonRecord): string {
  if (record.appearances === 0) return 'No appearances recorded this season.';

  const games = `${record.appearances} appearance${record.appearances === 1 ? '' : 's'}`;
  const minutes = `${record.minutesPlayed} minute${record.minutesPlayed === 1 ? '' : 's'}`;
  const contributions =
    record.goalContributions === 0
      ? null
      : `${record.goals} goal${record.goals === 1 ? '' : 's'} and ${record.assists} assist${record.assists === 1 ? '' : 's'}`;

  return contributions === null
    ? `${games}, ${minutes}.`
    : `${games}, ${minutes}, ${contributions}.`;
}

/**
 * BR103 — an appearance by a player who should not have taken the field.
 *
 * Recorded and flagged, never refused. The rule is deliberately evaluated
 * here rather than in the database: blocking the entry would not un-play
 * the match, it would only mean the club stops recording games. What the
 * platform owes is visibility to whoever has to deal with it.
 */
export interface IneligibleAppearance {
  readonly reason: string;
  readonly count: number;
}

export function ineligibleAppearances(input: {
  readonly appearances: number;
  readonly outstandingCents: number;
  readonly federationConfirmed: boolean;
}): readonly IneligibleAppearance[] {
  if (input.appearances === 0) return [];

  const flags: IneligibleAppearance[] = [];

  if (input.outstandingCents > 0) {
    flags.push({
      reason:
        'This player has taken the field with money outstanding. No pay, no play (BR79) — the club should know this happened.',
      count: input.appearances,
    });
  }

  if (!input.federationConfirmed) {
    flags.push({
      reason:
        'This player has taken the field without the federation confirming their registration. Under BR43 they were not eligible.',
      count: input.appearances,
    });
  }

  return flags;
}
