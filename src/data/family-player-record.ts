/**
 * The player record a family holds authority over (BR155, scope 70).
 *
 * Read through `app_family_player_profiles()` (migration 0063), never
 * `player_profile` directly: that table's select policy is the five roles
 * that pick teams (BR99), and it stays that way — the function returns the
 * row without height or weight, and only for the caller's own household.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FamilyPlayerProfile } from '../web/player-record-view.ts';
import { QueryError } from './queries.ts';

interface FamilyPlayerProfileRow {
  readonly registration_id: string;
  readonly person_id: string;
  readonly preferred_position: string | null;
  readonly secondary_position: string | null;
  readonly preferred_foot: string | null;
  readonly squad_number: number | null;
}

/** The confirmed profile for one registration, or null when none is recorded. */
export async function loadFamilyPlayerProfile(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
): Promise<FamilyPlayerProfile | null> {
  const { data, error } = await client.rpc('app_family_player_profiles', { p_club_id: clubId });
  // Thrown, not swallowed: an empty record because the read failed would
  // tell a family the club's correction never happened.
  if (error !== null) throw new QueryError('app_family_player_profiles', error.message);

  const row = ((data ?? []) as FamilyPlayerProfileRow[]).find((r) => r.registration_id === registrationId);
  if (row === undefined) return null;
  return {
    preferredPosition: row.preferred_position,
    secondaryPosition: row.secondary_position,
    preferredFoot: row.preferred_foot,
    squadNumber: row.squad_number,
  };
}
