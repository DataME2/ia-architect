/**
 * Carnivals — the host club's own view, and the public one.
 *
 * The public read is the product's **only deliberate exception to P5**
 * (P6, [decision 3](../../docs/decisions/3_public-event-data-crosses-tenant-isolation.md)),
 * and it needs no special client: `createUserClient()` with no session is
 * `anon`, and the additive policies on these three tables do the rest. A
 * service-role key here would have been the easy way and would have made
 * every other guarantee depend on this module getting its filters right.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { CarnivalEntry, CarnivalFixture } from '../domain/carnival/ladder.ts';

export interface CarnivalEvent {
  readonly id: string;
  readonly name: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly venue: string | null;
  readonly conditions: string | null;
  readonly pointsForWin: number;
  readonly pointsForDraw: number;
  readonly publishedAt: string | null;
}

const EVENT_COLUMNS =
  'id, name, starts_on, ends_on, venue, conditions, points_for_win, points_for_draw, published_at';

function toEvent(r: Record<string, unknown>): CarnivalEvent {
  return {
    id: r.id as string,
    name: r.name as string,
    startsOn: r.starts_on as string,
    endsOn: r.ends_on as string,
    venue: r.venue as string | null,
    conditions: r.conditions as string | null,
    pointsForWin: r.points_for_win as number,
    pointsForDraw: r.points_for_draw as number,
    publishedAt: r.published_at as string | null,
  };
}

export async function loadEvents(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly CarnivalEvent[]> {
  const { data } = await client
    .from('carnival_event')
    .select(EVENT_COLUMNS)
    .eq('club_id', clubId)
    .order('starts_on', { ascending: false });
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(toEvent);
}

export interface EventDetail {
  readonly event: CarnivalEvent;
  readonly entries: readonly CarnivalEntry[];
  readonly fixtures: readonly CarnivalFixture[];
}

/**
 * One event with its draw.
 *
 * **The same function serves the public page and the coordinator's**, with
 * the same client and no branch. What a visitor may see is decided by the
 * policy on `published_at`, not by an `if` here — so an unpublished event
 * returns null to a stranger because the database said so, and there is no
 * second code path to get wrong.
 */
export async function loadEventDetail(
  client: SupabaseClient,
  eventId: string,
): Promise<EventDetail | null> {
  const { data: eventRow } = await client
    .from('carnival_event')
    .select(EVENT_COLUMNS)
    .eq('id', eventId)
    .maybeSingle();

  if (eventRow === null) return null;

  const [{ data: entries }, { data: fixtures }] = await Promise.all([
    client.from('carnival_entry')
      .select('id, entrant_name, team_name, age_group')
      .eq('event_id', eventId)
      .order('entrant_name'),
    client.from('carnival_fixture')
      .select('id, home_entry_id, away_entry_id, played_on, kick_off, venue, home_goals, away_goals, status')
      .eq('event_id', eventId)
      .order('played_on'),
  ]);

  return {
    event: toEvent(eventRow as unknown as Record<string, unknown>),
    entries: ((entries ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      entrantName: r.entrant_name as string,
      teamName: r.team_name as string,
    })),
    fixtures: ((fixtures ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      homeEntryId: r.home_entry_id as string,
      awayEntryId: r.away_entry_id as string,
      playedOn: r.played_on as string,
      kickOff: r.kick_off as string | null,
      venue: r.venue as string | null,
      homeGoals: r.home_goals as number | null,
      awayGoals: r.away_goals as number | null,
      status: r.status as CarnivalFixture['status'],
    })),
  };
}

export async function createEvent(
  client: SupabaseClient,
  clubId: string,
  userId: string,
  name: string,
  startsOn: string,
  endsOn: string,
  venue: string | null,
): Promise<string | null> {
  const { error } = await client.from('carnival_event').insert({
    club_id: clubId,
    name, starts_on: startsOn, ends_on: endsOn, venue,
    // BR29 — whoever creates it is the recorded Events Coordinator until
    // somebody changes it. Recording nobody would leave the conditions
    // writable by any officer, which is what BR29 exists to prevent.
    coordinator_user_id: userId,
  });
  return error?.message ?? null;
}

export async function addEntry(
  client: SupabaseClient, clubId: string, eventId: string,
  entrantName: string, teamName: string, ageGroup: string | null,
): Promise<string | null> {
  const { error } = await client.from('carnival_entry').insert({
    club_id: clubId, event_id: eventId,
    entrant_name: entrantName, team_name: teamName, age_group: ageGroup,
  });
  return error?.message ?? null;
}

export async function addFixture(
  client: SupabaseClient, clubId: string, eventId: string,
  homeEntryId: string, awayEntryId: string,
  playedOn: string, kickOff: string | null, venue: string | null,
): Promise<string | null> {
  const { error } = await client.from('carnival_fixture').insert({
    club_id: clubId, event_id: eventId,
    home_entry_id: homeEntryId, away_entry_id: awayEntryId,
    played_on: playedOn, kick_off: kickOff, venue,
  });
  return error?.message ?? null;
}

export async function recordResult(
  client: SupabaseClient, fixtureId: string,
  homeGoals: number | null, awayGoals: number | null, status: string,
): Promise<string | null> {
  const { error } = await client
    .from('carnival_fixture')
    .update({ home_goals: homeGoals, away_goals: awayGoals, status })
    .eq('id', fixtureId);
  return error?.message ?? null;
}

/** BR140 — one explicit act, reversible, audited. */
export async function publishEvent(
  client: SupabaseClient, eventId: string, publish: boolean,
): Promise<string | null> {
  const { error } = await client.rpc('app_publish_event', {
    p_event_id: eventId, p_publish: publish,
  });
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}
