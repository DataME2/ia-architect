/**
 * The live match tracker's clock and stints (scope 112, WP3), pure.
 *
 * A stint is one player in one position from one match second to another.
 * Everything is kept in **match seconds**, so half time costs nobody any
 * minutes, and the whole state is plain data: the screen keeps it in the
 * browser, so a dropped signal at the ground loses nothing, and saving at
 * full time needs a connection like every other write (BR66).
 */
import { LINES, type Line } from './dugout.ts';
import type { GameTimeRow } from './academy.ts';

export type Phase = 'before' | 'first' | 'half-time' | 'second' | 'full-time';

export interface Stint {
  readonly personId: string;
  readonly position: Line;
  readonly from: number;
  readonly to: number | null;
}

export interface TrackerState {
  readonly phase: Phase;
  /** Match seconds played before the clock last started. */
  readonly elapsedBefore: number;
  /** When the clock last started (epoch ms), or null while it is stopped. */
  readonly runningSince: number | null;
  readonly stints: readonly Stint[];
}

export const NEW_MATCH: TrackerState = { phase: 'before', elapsedBefore: 0, runningSince: null, stints: [] };

export function elapsed(state: TrackerState, now: number): number {
  return state.elapsedBefore + (state.runningSince === null ? 0 : Math.max(0, Math.floor((now - state.runningSince) / 1000)));
}

/** "37:05" */
export function clockLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const NEXT: Readonly<Record<Phase, Phase | null>> = {
  before: 'first',
  first: 'half-time',
  'half-time': 'second',
  second: 'full-time',
  'full-time': null,
};

export const NEXT_LABEL: Readonly<Record<Phase, string | null>> = {
  before: 'Kick off',
  first: 'Half time',
  'half-time': 'Start the second half',
  second: 'Full time',
  'full-time': null,
};

/** Kick off, half time, second half, full time: the one button. */
export function advance(state: TrackerState, now: number): TrackerState {
  const next = NEXT[state.phase];
  if (next === null) return state;
  const t = elapsed(state, now);
  const running = next === 'first' || next === 'second';
  return {
    phase: next,
    elapsedBefore: t,
    runningSince: running ? now : null,
    // Full time ends every stint still open.
    stints: next === 'full-time' ? state.stints.map((s) => (s.to === null ? { ...s, to: t } : s)) : state.stints,
  };
}

/** Where each player is now; a player not in the map is on the bench. */
export function onPitch(state: TrackerState): ReadonlyMap<string, Line> {
  return new Map(state.stints.filter((s) => s.to === null).map((s) => [s.personId, s.position]));
}

/** Put a player in a position, move them, or (`null`) take them off. */
export function place(state: TrackerState, personId: string, position: Line | null, now: number): TrackerState {
  if (state.phase === 'full-time') return state;
  if ((onPitch(state).get(personId) ?? null) === position) return state;
  const t = elapsed(state, now);
  const closed = state.stints
    .map((s) => (s.personId === personId && s.to === null ? { ...s, to: t } : s))
    // A stint that never lasted a second (placed and moved before kick-off) is nothing.
    .filter((s) => s.to === null || s.to > s.from);
  return {
    ...state,
    stints: position === null ? closed : [...closed, { personId, position, from: t, to: null }],
  };
}

/** The game time to save: whole minutes per position, and who started. */
export function trackedGameTime(state: TrackerState, now: number): readonly GameTimeRow[] {
  const t = elapsed(state, now);
  const seconds = new Map<string, Partial<Record<Line, number>>>();
  const started = new Set<string>();
  for (const s of state.stints) {
    if (s.from === 0) started.add(s.personId);
    const bucket = seconds.get(s.personId) ?? {};
    bucket[s.position] = (bucket[s.position] ?? 0) + ((s.to ?? t) - s.from);
    seconds.set(s.personId, bucket);
  }
  return [...seconds.entries()].flatMap(([personId, bucket]) => {
    const positions: Partial<Record<Line, number>> = {};
    for (const p of LINES) {
      const minutes = Math.round((bucket[p] ?? 0) / 60);
      if (minutes > 0) positions[p] = minutes;
    }
    return Object.keys(positions).length === 0 ? [] : [{ personId, started: started.has(personId), positions }];
  });
}
