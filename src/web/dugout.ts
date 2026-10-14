/**
 * The Team Dugout's decisions (scope 99): who stands where on the pitch,
 * who sits on the bench, and what each shirt says.
 *
 * **Only a player who may take the field starts.** A player who is not
 * clear to play (BR79), not registered, or who said they are not available
 * this week (BR62) sits on the bench with the reason — never on the pitch,
 * where the drawing itself would suggest picking them. An empty position
 * is drawn as open rather than filled with somebody who cannot play.
 *
 * A formation is a **view**, not a record: nothing here is saved, so a
 * coach trying 3-5-2 commits the club to nothing (scope 99's gap notes).
 */
import { playEligibility } from '../domain/finance/eligibility.ts';
import type { RegistrationStatus } from '../domain/types.ts';

export type Position = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'utility';

/** Lines from the goal out: goalkeeper, defence, midfield, attack. */
export const LINES = ['goalkeeper', 'defender', 'midfielder', 'forward'] as const;
export type Line = (typeof LINES)[number];

export const FORMATIONS = {
  '4-3-3': [1, 4, 3, 3],
  '4-4-2': [1, 4, 4, 2],
  '3-5-2': [1, 3, 5, 2],
} as const satisfies Record<string, readonly [number, number, number, number]>;
export type FormationName = keyof typeof FORMATIONS;
export const FORMATION_NAMES = Object.keys(FORMATIONS) as FormationName[];

export type PlayerStatus = 'clear' | 'not-clear' | 'unregistered' | 'awaiting';
export type Availability = 'available' | 'not_available' | 'unanswered';

export interface DugoutPlayer {
  readonly id: string;
  readonly name: string;
  /** What fits on a shirt: "Riley S." */
  readonly shortName: string;
  readonly number: number | null;
  readonly preferred: Position | null;
  readonly secondary: Position | null;
  readonly status: PlayerStatus;
  /** Null when there is no upcoming fixture to answer for. */
  readonly availability: Availability | null;
}

export interface DugoutOfficial {
  readonly name: string;
  readonly role: string;
}

export interface Slot {
  readonly line: Line;
  /** Percentages across and down the pitch, own goal at the bottom. */
  readonly x: number;
  readonly y: number;
  readonly player: DugoutPlayer | null;
}

export interface BenchSeat {
  readonly player: DugoutPlayer;
  /** Why they are not on the pitch, or null for a fit substitute. */
  readonly reason: string | null;
}

/** BR79 in words: the verdict, never the amount (BR78). */
export const STATUS_LABEL: Readonly<Record<PlayerStatus, string>> = {
  clear: 'Clear to play',
  'not-clear': 'Not clear to play',
  unregistered: 'Not registered',
  awaiting: 'Registration incomplete',
};

export const AVAILABILITY_LABEL: Readonly<Record<Availability, string>> = {
  available: 'Available',
  not_available: 'Not available',
  unanswered: 'No answer yet',
};

/**
 * The registration's verdict, decided by the same `playEligibility` every
 * other screen uses — this season's balance, an earlier season's unpaid
 * debt (BR79 amended), an approved hardship (BR164) — and worded for the
 * pitch: money that blocks reads "not clear", anything else "incomplete".
 */
export function playerStatus(registration: {
  readonly status: string;
  readonly owes: boolean;
  readonly hardshipUntil: string | null;
  readonly owesEarlier?: boolean;
} | null): PlayerStatus {
  if (registration === null) return 'unregistered';
  const owesEarlier = registration.owesEarlier ?? false;
  const verdict = playEligibility(
    registration.status as RegistrationStatus,
    null,
    registration.owes,
    registration.hardshipUntil,
    owesEarlier,
  );
  if (verdict.mayPlay) return 'clear';
  return (registration.owes || owesEarlier) && registration.hardshipUntil === null ? 'not-clear' : 'awaiting';
}

/** "Riley Striker" → "Riley S." */
export function shortName(given: string, family: string): string {
  const initial = family.trim().charAt(0);
  return initial === '' ? given.trim() : `${given.trim()} ${initial.toUpperCase()}.`;
}

const Y: Readonly<Record<Line, number>> = { goalkeeper: 90, defender: 70, midfielder: 47, forward: 23 };

function byNumber(a: DugoutPlayer, b: DugoutPlayer): number {
  return (a.number ?? 100) - (b.number ?? 100) || a.name.localeCompare(b.name);
}

function benchReason(p: DugoutPlayer): string | null {
  if (p.status !== 'clear') return STATUS_LABEL[p.status];
  if (p.availability === 'not_available') return 'Not available this week';
  return null;
}

/**
 * Place the squad in a formation. Each line takes, in order: players whose
 * preferred position it is, then whose secondary position it is, then
 * utility players, then anyone fit who is left — so a squad of eleven fit
 * players always fills the pitch, and the specialists stand where they play.
 */
export function lineUp(
  players: readonly DugoutPlayer[],
  formation: FormationName,
): { readonly slots: readonly Slot[]; readonly bench: readonly BenchSeat[] } {
  const counts = FORMATIONS[formation];
  const fit = players.filter((p) => benchReason(p) === null).sort(byNumber);
  const taken = new Set<string>();
  const chosen: DugoutPlayer[][] = LINES.map(() => []);

  const passes: readonly ((p: DugoutPlayer, line: Line) => boolean)[] = [
    (p, line) => p.preferred === line,
    (p, line) => p.secondary === line,
    (p) => p.preferred === 'utility' || p.secondary === 'utility',
    () => true,
  ];
  for (const pass of passes) {
    LINES.forEach((line, i) => {
      for (const p of fit) {
        if (chosen[i]!.length >= counts[i]!) break;
        if (taken.has(p.id) || !pass(p, line)) continue;
        // The last pass fills by elimination, and goal is not filled that
        // way: an outfield player is not put in goal, nor a spare keeper
        // in defence. An empty goal is drawn as open; the spare keeper
        // waits on the bench.
        if (pass === passes[3] && (line === 'goalkeeper' || p.preferred === 'goalkeeper')) continue;
        chosen[i]!.push(p);
        taken.add(p.id);
      }
    });
  }

  const slots: Slot[] = LINES.flatMap((line, i) => {
    const n = counts[i]!;
    return Array.from({ length: n }, (_, k) => ({
      line,
      x: Math.round(((k + 1) / (n + 1)) * 1000) / 10,
      y: Y[line],
      player: chosen[i]![k] ?? null,
    }));
  });

  const bench: BenchSeat[] = players
    .filter((p) => !taken.has(p.id))
    .sort((a, b) => Number(benchReason(a) !== null) - Number(benchReason(b) !== null) || byNumber(a, b))
    .map((p) => ({ player: p, reason: benchReason(p) }));

  return { slots, bench };
}

/** "Next: v Rival United, 2026-10-18" — what the shirts' answers are for. */
export function fixtureLabel(fixture: { readonly opponent: string; readonly homeAway: string; readonly playedOn: string } | null): string | null {
  if (fixture === null) return null;
  const side = fixture.homeAway === 'home' ? 'v' : fixture.homeAway === 'away' ? 'at' : 'vs';
  return `Next: ${side} ${fixture.opponent}, ${fixture.playedOn}`;
}
