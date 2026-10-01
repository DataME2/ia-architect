import type { SupabaseClient } from '@supabase/supabase-js';

import type { Appearance, PlayerProfile, Position } from '../domain/performance/types.ts';
import { QueryError } from './queries.ts';
import type { AppearanceRow, FixtureRow, PlayerProfileRow } from './schema.ts';

function unwrap<T>(table: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error !== null) throw new QueryError(table, r.error.message);
  if (r.data === null) throw new QueryError(table, 'no data');
  return r.data;
}

const asPosition = (v: string | null): Position | null => (v === null ? null : (v as Position));

/**
 * A player's profile, or null when none is recorded.
 *
 * Read directly where the role may (the roles that pick teams, BR99), which
 * includes height and weight. Any other club member gets the profile through
 * app_club_player_profile (0064, BR156): positions, foot and squad number,
 * with height and weight null. Null never means "hidden" for those four, so
 * a correction reads the same to the whole club. Whether the physique was
 * recorded is still never disclosed to a role that may not read it: the page
 * says those two are not shown to the role, not that they are missing.
 */
export async function loadPlayerProfile(
  client: SupabaseClient,
  registrationId: string,
): Promise<PlayerProfile | null> {
  const rows = unwrap<PlayerProfileRow[]>(
    'player_profile',
    await client.from('player_profile').select('*').eq('registration_id', registrationId).limit(1),
  );
  const row = rows[0];
  if (row !== undefined) {
    return {
      heightCm: row.height_cm,
      weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
      preferredPosition: asPosition(row.preferred_position),
      secondaryPosition: asPosition(row.secondary_position),
      preferredFoot: (row.preferred_foot ?? null) as PlayerProfile['preferredFoot'],
      squadNumber: row.squad_number,
      recordedOn: row.recorded_on,
    };
  }

  const shared = unwrap<ClubPlayerProfileRow[]>(
    'app_club_player_profile',
    await client.rpc('app_club_player_profile', { p_registration_id: registrationId }),
  )[0];
  if (shared === undefined) return null;
  return {
    heightCm: null,
    weightKg: null,
    preferredPosition: asPosition(shared.preferred_position),
    secondaryPosition: asPosition(shared.secondary_position),
    preferredFoot: (shared.preferred_foot ?? null) as PlayerProfile['preferredFoot'],
    squadNumber: shared.squad_number,
    recordedOn: shared.recorded_on,
  };
}

/** What app_club_player_profile returns: the profile without the physique. */
interface ClubPlayerProfileRow {
  readonly preferred_position: string | null;
  readonly secondary_position: string | null;
  readonly preferred_foot: string | null;
  readonly squad_number: number | null;
  readonly recorded_on: string;
}

export async function loadAppearances(
  client: SupabaseClient,
  registrationId: string,
): Promise<readonly Appearance[]> {
  const rows = unwrap<AppearanceRow[]>(
    'appearance',
    await client.from('appearance').select('*').eq('registration_id', registrationId),
  );
  if (rows.length === 0) return [];

  const fixtures = unwrap<FixtureRow[]>(
    'fixture',
    await client
      .from('fixture')
      .select('*')
      .in('id', rows.map((r) => r.fixture_id)),
  );
  const byId = new Map(fixtures.map((f) => [f.id, f]));

  return rows.flatMap((row) => {
    const f = byId.get(row.fixture_id);
    // A fixture the caller cannot read leaves an appearance with nothing to
    // describe it, so it is dropped rather than rendered as a blank row.
    if (f === undefined) return [];
    return [
      {
        fixtureId: row.fixture_id,
        playedOn: f.played_on,
        opponent: f.opponent,
        homeAway: f.home_away as Appearance['homeAway'],
        competition: f.competition,
        minutesPlayed: row.minutes_played,
        started: row.started,
        goals: row.goals,
        assists: row.assists,
        recordedBy: row.recorded_by,
        recordedAt: row.recorded_at,
      },
    ];
  });
}

export async function loadFixtures(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly FixtureRow[]> {
  return unwrap<FixtureRow[]>(
    'fixture',
    await client
      .from('fixture')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .order('played_on', { ascending: false }),
  );
}
