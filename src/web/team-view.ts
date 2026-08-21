/**
 * The team screens' decisions.
 *
 * Pure. Grouping a roster, labelling a role, and saying what is wrong with
 * an official's paperwork are all decisions, and they are testable here
 * without a database or a browser.
 */
import { mayHoldRole, type ClearanceVerdict } from '../domain/teams/clearance.ts';
import type { Clearance, TeamRole } from '../domain/teams/types.ts';
import { isOfficialRole, TEAM_ROLES } from '../domain/teams/types.ts';
import type { IsoDate } from '../domain/types.ts';

export const TEAM_ROLE_LABEL: Readonly<Record<TeamRole, string>> = {
  player: 'Player',
  coach: 'Coach',
  'assistant-coach': 'Assistant coach',
  manager: 'Manager',
  'team-official': 'Team official',
};

export function parseTeamRole(value: unknown): TeamRole | null {
  return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value)
    ? (value as TeamRole)
    : null;
}

export interface RosterEntry {
  readonly memberId: string;
  readonly personId: string;
  readonly displayName: string;
  readonly legalName: string;
  readonly role: TeamRole;
  /** Only meaningful for officials; players are never asked (BR19). */
  readonly clearance: ClearanceVerdict;
}

export interface Roster {
  readonly players: readonly RosterEntry[];
  readonly officials: readonly RosterEntry[];
}

/**
 * Split a team into the squad and the adults responsible for it.
 *
 * Two lists rather than one sorted list, because they answer different
 * questions. "Who plays" is a team sheet; "who is cleared to stand in front
 * of them" is a safeguarding question, and burying it among thirty player
 * names is how it stops being asked.
 */
export function buildRoster(entries: readonly RosterEntry[]): Roster {
  const byName = (a: RosterEntry, b: RosterEntry): number =>
    a.legalName.localeCompare(b.legalName);

  return {
    players: entries.filter((e) => !isOfficialRole(e.role)).sort(byName),
    // Officials with a problem first: that is the actionable end of the list.
    officials: entries
      .filter((e) => isOfficialRole(e.role))
      .sort((a, b) =>
        a.clearance.ok === b.clearance.ok ? byName(a, b) : a.clearance.ok ? 1 : -1,
      ),
  };
}

/** Officials whose paperwork does not cover the season. */
export function unclearedOfficials(roster: Roster): readonly RosterEntry[] {
  return roster.officials.filter((o) => !o.clearance.ok);
}

/**
 * One line for a team card in a list.
 *
 * Leads with the safeguarding problem where there is one, because a squad
 * size is information and an uncleared coach is a thing to do today.
 */
export function teamSummary(roster: Roster): string {
  const uncleared = unclearedOfficials(roster);
  const squad = `${roster.players.length} player${roster.players.length === 1 ? '' : 's'}`;

  if (uncleared.length > 0) {
    return `${squad} · ${uncleared.length} official${uncleared.length === 1 ? '' : 's'} without a clearance covering this season`;
  }
  if (roster.officials.length === 0) {
    return `${squad} · no officials yet`;
  }
  return `${squad} · ${roster.officials.length} official${roster.officials.length === 1 ? '' : 's'}, all cleared`;
}

/**
 * Whether this person could be added in this role, asked before the button
 * is pressed.
 *
 * The database refuses anyway — BR83 is a trigger — but a refusal arriving
 * as a 500 after a form post is not an answer a registrar can act on.
 */
export function couldAdd(
  role: TeamRole,
  clearances: readonly Clearance[],
  seasonEndsOn: IsoDate,
): ClearanceVerdict {
  return mayHoldRole(role, clearances, seasonEndsOn);
}
