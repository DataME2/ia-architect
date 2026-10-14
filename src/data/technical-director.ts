/**
 * The Technical Director's reads (scope 98, BR176). The activity is the
 * database's answer (`app_player_activity`, 0093): it decides who may read
 * it and leaves money out, so this only maps the rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ActivityRow } from '../web/technical-director.ts';
import { QueryError } from './queries.ts';

export async function loadPlayerActivity(
  client: SupabaseClient,
  clubId: string,
  days = 30,
): Promise<readonly ActivityRow[]> {
  const { data, error } = await client.rpc('app_player_activity', { p_club_id: clubId, p_days: days });
  if (error !== null) throw new QueryError('app_player_activity', error.message);
  return ((data ?? []) as {
    occurred_at: string;
    action: string;
    person_id: string;
    person_name: string;
    actor_name: string | null;
  }[]).map((r) => ({
    occurredAt: r.occurred_at,
    action: r.action,
    personId: r.person_id,
    personName: r.person_name,
    actorName: r.actor_name,
  }));
}

/** Each player's registration this season, so the feed can link to the record. */
export async function registrationsByPerson(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  personIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (personIds.length === 0) return new Map();
  const { data } = await client
    .from('registration')
    .select('id, person_id')
    .eq('club_id', clubId)
    .eq('season_id', seasonId)
    .in('person_id', [...new Set(personIds)]);
  return new Map(((data ?? []) as { id: string; person_id: string }[]).map((r) => [r.person_id, r.id]));
}
