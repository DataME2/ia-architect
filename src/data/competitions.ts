/**
 * The competition catalogue.
 *
 * Shared reference data (BR134,
 * [decision 15](../../docs/decisions/15_the_competition_catalogue_is_shared_reference_data.md)):
 * readable by every signed-in club, written only by platform
 * administration. A club's *participation* is tenant-scoped and lives in
 * `club_competition`, which is an ordinary row with an ordinary policy.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ClassificationLevel, Competition } from '../domain/competition/types.ts';

export interface Association {
  readonly id: string;
  readonly name: string;
  readonly jurisdiction: string;
}

function toLevel(row: Record<string, unknown> | null | undefined): ClassificationLevel | null {
  if (row === null || row === undefined) return null;
  return {
    id: row.id as string,
    associationId: row.association_id as string,
    name: row.name as string,
    rank: row.rank as number,
  };
}

export async function loadAssociations(client: SupabaseClient): Promise<readonly Association[]> {
  const { data } = await client.from('association').select('id, name, jurisdiction').order('name');
  return (data ?? []) as readonly Association[];
}

export async function loadLevels(
  client: SupabaseClient,
  associationId?: string,
): Promise<readonly ClassificationLevel[]> {
  let query = client.from('classification_level').select('id, association_id, name, rank');
  if (associationId !== undefined) query = query.eq('association_id', associationId);
  const { data } = await query.order('rank', { ascending: false });
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => toLevel(r))
    .filter((l): l is ClassificationLevel => l !== null);
}

/**
 * Every competition, with its minimum resolved.
 *
 * Two plain queries joined here rather than a PostgREST embed. The embed
 * reads tersely and types badly — an embedded row arrives as `T | T[]`
 * depending on the relationship PostgREST infers, and the cast that hides
 * that is the kind of cast this codebase avoids in `src/data/`.
 */
export async function loadCompetitions(client: SupabaseClient): Promise<readonly Competition[]> {
  const [{ data: rows }, levels] = await Promise.all([
    client
      .from('competition')
      .select('id, association_id, name, tier, playing_format, minimum_classification_id')
      .order('name'),
    loadLevels(client),
  ]);

  const byId = new Map(levels.map((l) => [l.id, l]));

  return ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    associationId: r.association_id as string,
    name: r.name as string,
    tier: r.tier as string | null,
    playingFormat: r.playing_format as string | null,
    minimum: r.minimum_classification_id === null
      ? null
      : byId.get(r.minimum_classification_id as string) ?? null,
  }));
}

/** The competitions this club plays in, this season. */
export async function loadClubCompetitions(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly Competition[]> {
  const { data } = await client
    .from('club_competition')
    .select('competition_id')
    .eq('club_id', clubId)
    .eq('season_id', seasonId);

  const ids = new Set(((data ?? []) as { competition_id: string }[]).map((r) => r.competition_id));
  if (ids.size === 0) return [];
  return (await loadCompetitions(client)).filter((c) => ids.has(c.id));
}

/**
 * BR8's floor for one fixture, or `null`.
 *
 * Null is two ordinary cases and an error in neither: a friendly with no
 * competition ([#78](../../docs/scope/open-questions.md)), and a
 * competition that states no minimum.
 */
export async function loadFixtureMinimum(
  client: SupabaseClient,
  fixtureId: string,
): Promise<ClassificationLevel | null> {
  const { data } = await client
    .from('fixture')
    .select('competition_id')
    .eq('id', fixtureId)
    .maybeSingle();

  const competitionId = (data as { competition_id: string | null } | null)?.competition_id ?? null;
  if (competitionId === null) return null;

  const competitions = await loadCompetitions(client);
  return competitions.find((c) => c.id === competitionId)?.minimum ?? null;
}

export async function addAssociation(
  client: SupabaseClient, name: string, jurisdiction: string,
): Promise<string | null> {
  const { error } = await client.from('association').insert({ name, jurisdiction });
  return error?.message ?? null;
}

export async function addLevel(
  client: SupabaseClient, associationId: string, name: string, rank: number,
): Promise<string | null> {
  const { error } = await client
    .from('classification_level')
    .insert({ association_id: associationId, name, rank });
  return error?.message ?? null;
}

export async function addCompetition(
  client: SupabaseClient,
  associationId: string,
  name: string,
  tier: string | null,
  playingFormat: string | null,
  minimumClassificationId: string | null,
): Promise<string | null> {
  const { error } = await client.from('competition').insert({
    association_id: associationId,
    name,
    tier,
    playing_format: playingFormat,
    minimum_classification_id: minimumClassificationId,
  });
  return error?.message ?? null;
}

export async function setClubCompetition(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  competitionId: string,
  plays: boolean,
): Promise<string | null> {
  if (plays) {
    const { error } = await client
      .from('club_competition')
      .upsert({ club_id: clubId, season_id: seasonId, competition_id: competitionId },
              { onConflict: 'club_id,season_id,competition_id' });
    return error?.message ?? null;
  }
  const { error } = await client
    .from('club_competition')
    .delete()
    .eq('club_id', clubId).eq('season_id', seasonId).eq('competition_id', competitionId);
  return error?.message ?? null;
}
