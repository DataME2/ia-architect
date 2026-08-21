/**
 * Teams, and who stands in front of them.
 *
 * Realises the Team and Team Official business objects. Pure types — the
 * safeguarding judgement lives in `clearance.ts` beside them, so it can be
 * tested without a database and read without one either.
 */
import type { IsoDate, IsoInstant } from '../types.ts';

/**
 * Every role but `player` puts an adult in front of children, which is what
 * makes BR19 apply to them and not to the squad.
 */
export const TEAM_ROLES = [
  'player',
  'coach',
  'assistant-coach',
  'manager',
  'team-official',
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const OFFICIAL_ROLES: readonly TeamRole[] = TEAM_ROLES.filter((r) => r !== 'player');

export function isOfficialRole(role: TeamRole): boolean {
  return role !== 'player';
}

export interface Team {
  readonly id: string;
  readonly seasonId: string;
  readonly name: string;
  readonly ageGroup: string | null;
}

export interface TeamMember {
  readonly id: string;
  readonly teamId: string;
  readonly personId: string;
  readonly role: TeamRole;
}

/** A Working with Children Check, as the club holds it. */
export interface Clearance {
  readonly id: string;
  readonly personId: string;
  /** 'WWCC', or the state's own name for it. Configuration, not code. */
  readonly kind: string;
  readonly identifier: string;
  readonly issuedOn: IsoDate | null;
  readonly expiresOn: IsoDate;
  /** Null means someone typed a number and nobody checked it (BR19). */
  readonly verifiedAt: IsoInstant | null;
  readonly revokedAt: IsoInstant | null;
}
