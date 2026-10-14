/**
 * Every fixture a club has, across seasons, for the competition calendar
 * (scope 99). Read through the caller's own policies (`fixture_select`):
 * any member reads the club's fixtures, and a fixture carries no person.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CalendarFixture } from '../web/competition-calendar.ts';
import { QueryError } from './queries.ts';

export async function loadClubCalendar(
  client: SupabaseClient,
  clubId: string,
): Promise<{ readonly fixtures: readonly CalendarFixture[]; readonly teams: readonly { readonly id: string; readonly name: string }[] }> {
  const [fixtures, teams] = await Promise.all([
    client
      .from('fixture')
      .select('id, team_id, played_on, kick_off, opponent, home_away, competition, venue, status, goals_for, goals_against')
      .eq('club_id', clubId)
      .order('played_on', { ascending: true }),
    client.from('team').select('id, name').eq('club_id', clubId),
  ]);
  if (fixtures.error !== null) throw new QueryError('fixture', fixtures.error.message);
  const teamRows = (teams.data ?? []) as { id: string; name: string }[];
  const teamName = new Map(teamRows.map((t) => [t.id, t.name]));
  return {
    fixtures: ((fixtures.data ?? []) as {
      id: string;
      team_id: string | null;
      played_on: string;
      kick_off: string | null;
      opponent: string;
      home_away: string;
      competition: string | null;
      venue: string | null;
      status: string;
      goals_for: number | null;
      goals_against: number | null;
    }[]).map((f) => ({
      id: f.id,
      teamId: f.team_id,
      teamName: f.team_id === null ? 'Club' : teamName.get(f.team_id) ?? 'Team',
      playedOn: f.played_on,
      kickOff: f.kick_off,
      opponent: f.opponent,
      homeAway: f.home_away,
      competition: f.competition,
      venue: f.venue,
      status: f.status,
      goalsFor: f.goals_for,
      goalsAgainst: f.goals_against,
    })),
    // A team name can repeat across seasons ("U12 Academy" every year);
    // the filter lists each id once, labelled by name.
    teams: teamRows.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
