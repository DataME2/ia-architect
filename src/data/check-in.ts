/**
 * Reads and writes for the daily check-in and academy teams (scope 113,
 * 0096). The request's client throughout, so 0096 decides who reads and
 * writes: a coach's or a Technical Lead's read returns only the players
 * BR186 lets them see, and nothing here re-checks a role.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { IsoDate } from '../domain/types.ts';
import type { Scores, SessionEntry, SessionKind, WellbeingEntry } from '../web/check-in.ts';
import { QueryError } from './queries.ts';
import type { ConsentRow, RpeEntryRow, WellbeingEntryRow } from './schema.ts';

function unwrap<T>(table: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error !== null) throw new QueryError(table, r.error.message);
  if (r.data === null) throw new QueryError(table, 'no data');
  return r.data;
}

/** The trigger and function messages are written for a person; pass them on. */
const said = (error: { message: string } | null): string | null =>
  error === null ? null : error.message.replace(/^.*?:\s*/, '');

const toWellbeing = (r: WellbeingEntryRow): WellbeingEntry => ({
  personId: r.person_id,
  on: r.entered_on,
  motivation: r.motivation,
  mood: r.mood,
  sleep_quality: r.sleep_quality,
  stress: r.stress,
  soreness: r.soreness,
});

const toSession = (r: RpeEntryRow): SessionEntry => ({
  id: r.id,
  personId: r.person_id,
  on: r.done_on,
  kind: r.kind,
  rpe: r.rpe,
});

// ----------------------------------------------------------- who is asked

export interface CheckInPlayer {
  readonly personId: string;
  readonly teamId: string;
  /** When consent was given (BR185); null without one. */
  readonly consentedOn: IsoDate | null;
}

/** BR184's players the caller may read a check-in for, with their consent. */
export async function loadCheckInPlayers(client: SupabaseClient, clubId: string): Promise<readonly CheckInPlayer[]> {
  const rows = unwrap<{ person_id: string; team_id: string; consented_at: string | null }[]>(
    'app_check_in_players',
    await client.rpc('app_check_in_players', { p_club_id: clubId }),
  );
  return rows.map((r) => ({
    personId: r.person_id,
    teamId: r.team_id,
    consentedOn: r.consented_at === null ? null : r.consented_at.slice(0, 10),
  }));
}

export interface CheckInStatus {
  /** BR184: on a current academy team of U13 or older. */
  readonly applies: boolean;
  readonly consent: { readonly on: IsoDate; readonly bySelf: boolean } | null;
}

/** Whether one person is asked to check in, and on whose agreement. */
export async function loadCheckInStatus(client: SupabaseClient, clubId: string, personId: string): Promise<CheckInStatus> {
  const players = await loadCheckInPlayers(client, clubId);
  const mine = players.find((p) => p.personId === personId);
  if (mine === undefined) return { applies: false, consent: null };
  if (mine.consentedOn === null) return { applies: true, consent: null };
  const { data } = await client
    .from('consent')
    .select('granted_by_person_id, granted_at')
    .eq('club_id', clubId)
    .eq('person_id', personId)
    .eq('purpose', 'ATHLETE_WELLBEING')
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as Pick<ConsentRow, 'granted_by_person_id' | 'granted_at'> | undefined;
  return { applies: true, consent: { on: mine.consentedOn, bySelf: row?.granted_by_person_id === personId } };
}

export async function grantCheckInConsent(client: SupabaseClient, clubId: string, personId: string): Promise<string | null> {
  return said((await client.rpc('app_grant_check_in_consent', { p_club_id: clubId, p_person_id: personId })).error);
}

export async function withdrawCheckInConsent(client: SupabaseClient, clubId: string, personId: string): Promise<string | null> {
  return said((await client.rpc('app_withdraw_check_in_consent', { p_club_id: clubId, p_person_id: personId })).error);
}

// ---------------------------------------------------------------- entries

export async function loadWellbeing(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
  from: IsoDate,
  to: IsoDate,
): Promise<readonly WellbeingEntry[]> {
  if (personIds.length === 0) return [];
  const rows = unwrap<WellbeingEntryRow[]>(
    'wellbeing_entry',
    await client
      .from('wellbeing_entry')
      .select('*')
      .eq('club_id', clubId)
      .in('person_id', [...personIds])
      .gte('entered_on', from)
      .lte('entered_on', to)
      .order('entered_on'),
  );
  return rows.map(toWellbeing);
}

export async function loadSessions(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
  from: IsoDate,
  to: IsoDate,
): Promise<readonly SessionEntry[]> {
  if (personIds.length === 0) return [];
  const rows = unwrap<RpeEntryRow[]>(
    'rpe_entry',
    await client
      .from('rpe_entry')
      .select('*')
      .eq('club_id', clubId)
      .in('person_id', [...personIds])
      .gte('done_on', from)
      .lte('done_on', to)
      .order('entered_at'),
  );
  return rows.map(toSession);
}

/** Today's answers, written or rewritten until the day ends (BR186). */
export async function saveWellbeing(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  on: IsoDate,
  scores: Scores,
): Promise<string | null> {
  const { error } = await client
    .from('wellbeing_entry')
    .upsert({ club_id: clubId, person_id: personId, entered_on: on, ...scores }, { onConflict: 'person_id,entered_on' });
  return said(error);
}

export async function addSession(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  session: { readonly on: IsoDate; readonly kind: SessionKind; readonly rpe: number },
): Promise<string | null> {
  const { error } = await client
    .from('rpe_entry')
    .insert({ club_id: clubId, person_id: personId, done_on: session.on, kind: session.kind, rpe: session.rpe });
  return said(error);
}

export async function removeSession(client: SupabaseClient, clubId: string, sessionId: string): Promise<string | null> {
  return said((await client.from('rpe_entry').delete().eq('club_id', clubId).eq('id', sessionId)).error);
}

// ---------------------------------------------------------- academy teams

/** BR184: a Technical Lead marks or unmarks a team; 0096's trigger decides. */
export async function setTeamAcademy(client: SupabaseClient, teamId: string, academy: boolean): Promise<string | null> {
  return said((await client.rpc('app_set_team_academy', { p_team_id: teamId, p_academy: academy })).error);
}
