/** What a player did in one fixture. Counts, never events (BR102). */
export interface Appearance {
  readonly fixtureId: string;
  readonly playedOn: string;
  readonly opponent: string;
  readonly homeAway: 'home' | 'away' | 'neutral';
  readonly competition: string | null;
  readonly minutesPlayed: number;
  readonly started: boolean;
  readonly goals: number;
  readonly assists: number;
  /** BR101 — a statistic here is one person's recollection. */
  readonly recordedBy: string | null;
  readonly recordedAt: string;
}

export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'utility';

export interface PlayerProfile {
  readonly heightCm: number | null;
  readonly weightKg: number | null;
  readonly preferredPosition: Position | null;
  readonly secondaryPosition: Position | null;
  readonly preferredFoot: 'left' | 'right' | 'both' | null;
  readonly squadNumber: number | null;
  readonly recordedOn: string;
}

export interface SeasonRecord {
  readonly appearances: number;
  readonly starts: number;
  readonly substituteAppearances: number;
  readonly minutesPlayed: number;
  readonly goals: number;
  readonly assists: number;
  /** Goal involvements — the one derived figure worth showing at this level. */
  readonly goalContributions: number;
}
