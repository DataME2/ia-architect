/**
 * An official's own availability (scope 90; BR174, migration 0087).
 *
 * Reading goes through `loadDeclaredAvailability`, which RLS narrows to the
 * caller's own rows. Writing is here: the week is replaced as a whole by
 * `app_set_my_availability()`, so a half-saved grid is never visible; away
 * periods are rows the official adds and removes under their own policies.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { GridWindow } from '../web/referee-board.ts';

export async function setOwnWeek(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  windows: readonly GridWindow[],
): Promise<string | null> {
  const { error } = await client.rpc('app_set_my_availability', {
    p_club_id: clubId,
    p_season_id: seasonId,
    p_windows: windows,
  });
  return error === null ? null : error.message;
}

export async function addOwnAway(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  startsOn: string,
  endsOn: string,
  reason: string | null,
): Promise<string | null> {
  const { error } = await client
    .from('referee_unavailability')
    .insert({ club_id: clubId, person_id: personId, starts_on: startsOn, ends_on: endsOn, reason });
  if (error === null) return null;
  return error.code === '42501' ? 'Only a match official records their own time away (BR174).' : error.message;
}

export async function removeOwnAway(client: SupabaseClient, clubId: string, id: string): Promise<string | null> {
  const { data, error } = await client.from('referee_unavailability').delete().eq('club_id', clubId).eq('id', id).select('id');
  if (error !== null) return error.message;
  return (data ?? []).length === 0 ? 'That period is not yours to remove.' : null;
}
