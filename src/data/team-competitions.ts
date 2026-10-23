/**
 * Which competition each team plays in (scope 102, BR179), and the history
 * of every change to it.
 *
 * No `recordAudit` here, deliberately: 0094's trigger writes the history
 * from inside the database on every entry and withdrawal, so a change made
 * any other way is logged too, and this module cannot forget to.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CompetitionChange } from '../web/team-competitions.ts';
import { QueryError } from './queries.ts';

export interface TeamCompetition {
  readonly teamId: string;
  readonly calendarId: string;
  readonly competitionRef: string;
}

/** Every competition the given teams are entered in. Any club member reads these. */
export async function loadTeamCompetitions(
  client: SupabaseClient,
  clubId: string,
  teamIds: readonly string[],
): Promise<readonly TeamCompetition[]> {
  if (teamIds.length === 0) return [];
  const { data, error } = await client
    .from('team_competition')
    .select('team_id, calendar_id, competition_ref')
    .eq('club_id', clubId)
    .in('team_id', [...teamIds])
    .order('entered_at');
  if (error !== null) throw new QueryError('team_competition', error.message);
  return (data ?? []).map((r: { team_id: string; calendar_id: string; competition_ref: string }) => ({
    teamId: r.team_id,
    calendarId: r.calendar_id,
    competitionRef: r.competition_ref,
  }));
}

/** Enter a team; `false` when it was already entered (the unique key answers, not a read first). */
export async function enterTeamCompetition(
  client: SupabaseClient,
  clubId: string,
  teamId: string,
  calendarId: string,
  competitionRef: string,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly error: string }> {
  const { error } = await client
    .from('team_competition')
    .insert({ club_id: clubId, team_id: teamId, calendar_id: calendarId, competition_ref: competitionRef });
  if (error === null) return { ok: true };
  if (error.code === '23505') return { ok: false, error: 'This team is already in that competition.' };
  if (error.code === '42501') {
    return { ok: false, error: 'Only an administrator, registrar, coordinator or program coordinator changes a team’s competitions.' };
  }
  throw new QueryError('team_competition', error.message);
}

/** Withdraw a team. Returns how many rows went: 0 means it was not entered, or the caller may not. */
export async function withdrawTeamCompetition(
  client: SupabaseClient,
  clubId: string,
  teamId: string,
  calendarId: string,
  competitionRef: string,
): Promise<number> {
  const { data, error } = await client
    .from('team_competition')
    .delete()
    .eq('club_id', clubId)
    .eq('team_id', teamId)
    .eq('calendar_id', calendarId)
    .eq('competition_ref', competitionRef)
    .select('id');
  if (error !== null) throw new QueryError('team_competition', error.message);
  return (data ?? []).length;
}

/** The latest 200 changes, each with who made it. Empty for anyone outside BR179's four roles. */
export async function loadCompetitionHistory(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly CompetitionChange[]> {
  const { data, error } = await client.rpc('app_team_competition_history', { p_club_id: clubId });
  if (error !== null) throw new QueryError('app_team_competition_history', error.message);
  return ((data ?? []) as {
    changed_at: string;
    action: 'entered' | 'withdrawn';
    team_name: string;
    calendar_id: string;
    competition_ref: string;
    changed_by_name: string;
  }[]).map((r) => ({
    changedAt: r.changed_at,
    action: r.action,
    teamName: r.team_name,
    calendarId: r.calendar_id,
    competitionRef: r.competition_ref,
    changedByName: r.changed_by_name,
  }));
}
