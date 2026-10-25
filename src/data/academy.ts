/**
 * Reads and writes for the academy (scope 112, 0095): training nights, the
 * answers and marks on them, and minutes by position. Every call uses the
 * request's client, so 0095's policies decide who reads and writes; nothing
 * here re-checks a role.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { IsoDate } from '../domain/types.ts';
import { totalMinutes, type AttendanceMark, type GameTimeRow, type MarkEntry } from '../web/academy.ts';
import { LINES, type Line } from '../web/dugout.ts';
import { displayNameFor } from '../web/queue-view.ts';
import { QueryError } from './queries.ts';
import type {
  AppearancePositionRow,
  AppearanceRow,
  FixtureRow,
  ParticipationResponseRow,
  TrainingAttendanceRow,
  TrainingSessionRow,
} from './schema.ts';

function unwrap<T>(table: string, r: { data: T | null; error: { message: string } | null }): T {
  if (r.error !== null) throw new QueryError(table, r.error.message);
  if (r.data === null) throw new QueryError(table, 'no data');
  return r.data;
}

/** The trigger and policy messages are written for a person; pass them on. */
const said = (error: { message: string } | null): string | null =>
  error === null ? null : error.message.replace(/^.*?:\s*/, '');

// ------------------------------------------------------------------ nights

export interface Night {
  readonly id: string;
  readonly teamId: string;
  readonly heldOn: IsoDate;
  readonly startsAt: string;
  readonly endsAt: string | null;
  readonly venue: string | null;
  readonly cancelled: boolean;
}

const toNight = (r: TrainingSessionRow): Night => ({
  id: r.id,
  teamId: r.team_id,
  heldOn: r.held_on,
  startsAt: r.starts_at.slice(0, 5),
  endsAt: r.ends_at === null ? null : r.ends_at.slice(0, 5),
  venue: r.venue,
  cancelled: r.cancelled_at !== null,
});

/** The nights of these teams between two dates, inclusive, in order. */
export async function loadNights(
  client: SupabaseClient,
  clubId: string,
  teamIds: readonly string[],
  from: IsoDate,
  to: IsoDate,
): Promise<readonly Night[]> {
  if (teamIds.length === 0) return [];
  const rows = unwrap<TrainingSessionRow[]>(
    'training_session',
    await client
      .from('training_session')
      .select('*')
      .eq('club_id', clubId)
      .in('team_id', [...teamIds])
      .gte('held_on', from)
      .lte('held_on', to)
      .order('held_on')
      .order('starts_at'),
  );
  return rows.map(toNight);
}

export async function addNights(
  client: SupabaseClient,
  clubId: string,
  nights: {
    readonly teamId: string;
    readonly dates: readonly IsoDate[];
    readonly startsAt: string;
    readonly endsAt: string | null;
    readonly venue: string | null;
  },
): Promise<string | null> {
  const { error } = await client.from('training_session').upsert(
    nights.dates.map((held_on) => ({
      club_id: clubId,
      team_id: nights.teamId,
      held_on,
      starts_at: nights.startsAt,
      ends_at: nights.endsAt,
      venue: nights.venue,
    })),
    // A night already entered is left as it is, answers and all.
    { onConflict: 'team_id,held_on,starts_at', ignoreDuplicates: true },
  );
  return said(error);
}

export interface NightAnswer {
  readonly sessionId: string;
  readonly personId: string;
  readonly available: boolean;
  readonly reason: string | null;
}

/** BR62's answers to these nights. A family reads only its own. */
export async function loadNightAnswers(
  client: SupabaseClient,
  clubId: string,
  sessionIds: readonly string[],
): Promise<readonly NightAnswer[]> {
  if (sessionIds.length === 0) return [];
  const rows = unwrap<ParticipationResponseRow[]>(
    'participation_response',
    await client
      .from('participation_response')
      .select('*')
      .eq('club_id', clubId)
      .in('training_session_id', [...sessionIds]),
  );
  return rows.flatMap((r) =>
    r.training_session_id === null
      ? []
      : [{ sessionId: r.training_session_id, personId: r.person_id, available: r.status === 'available', reason: r.reason }],
  );
}

export interface NightMark {
  readonly sessionId: string;
  readonly personId: string;
  readonly mark: AttendanceMark;
  readonly reason: string | null;
}

export async function loadNightMarks(
  client: SupabaseClient,
  clubId: string,
  sessionIds: readonly string[],
): Promise<readonly NightMark[]> {
  if (sessionIds.length === 0) return [];
  const rows = unwrap<TrainingAttendanceRow[]>(
    'training_attendance',
    await client
      .from('training_attendance')
      .select('*')
      .eq('club_id', clubId)
      .in('training_session_id', [...sessionIds]),
  );
  return rows.map((r) => ({ sessionId: r.training_session_id, personId: r.person_id, mark: r.mark, reason: r.reason }));
}

export async function recordMarks(
  client: SupabaseClient,
  clubId: string,
  sessionId: string,
  marks: readonly MarkEntry[],
): Promise<string | null> {
  const { error } = await client.from('training_attendance').upsert(
    marks.map((m) => ({
      club_id: clubId,
      training_session_id: sessionId,
      person_id: m.personId,
      mark: m.mark,
      reason: m.reason,
    })),
    { onConflict: 'training_session_id,person_id' },
  );
  return said(error);
}

// --------------------------------------------------------------- game time

export interface PlayedMinutes {
  readonly personId: string;
  readonly minutes: number;
  readonly positions: readonly { readonly position: Line; readonly minutes: number }[];
}

async function positionsOf(
  client: SupabaseClient,
  appearanceIds: readonly string[],
): Promise<readonly AppearancePositionRow[]> {
  if (appearanceIds.length === 0) return [];
  return unwrap<AppearancePositionRow[]>(
    'appearance_position',
    await client.from('appearance_position').select('*').in('appearance_id', [...appearanceIds]),
  );
}

function withPositions(
  appearances: readonly AppearanceRow[],
  positions: readonly AppearancePositionRow[],
): readonly PlayedMinutes[] {
  return appearances.map((a) => ({
    personId: a.person_id,
    minutes: a.minutes_played,
    positions: positions
      .filter((p) => p.appearance_id === a.id)
      .map((p) => ({ position: p.position, minutes: p.minutes })),
  }));
}

/** Every appearance this season for one team's fixtures, with its positions. */
export async function loadTeamMinutes(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  teamId: string,
): Promise<readonly PlayedMinutes[]> {
  const fixtures = unwrap<Pick<FixtureRow, 'id'>[]>(
    'fixture',
    await client.from('fixture').select('id').eq('club_id', clubId).eq('season_id', seasonId).eq('team_id', teamId),
  );
  if (fixtures.length === 0) return [];
  const appearances = unwrap<AppearanceRow[]>(
    'appearance',
    await client.from('appearance').select('*').in('fixture_id', fixtures.map((f) => f.id)),
  );
  return withPositions(appearances, await positionsOf(client, appearances.map((a) => a.id)));
}

/** Of these fixtures, the ones with positions recorded (scope 113's tile). */
export async function loadFixturesWithPositions(
  client: SupabaseClient,
  fixtureIds: readonly string[],
): Promise<ReadonlySet<string>> {
  if (fixtureIds.length === 0) return new Set();
  const appearances = unwrap<Pick<AppearanceRow, 'id' | 'fixture_id'>[]>(
    'appearance',
    await client.from('appearance').select('id, fixture_id').in('fixture_id', [...fixtureIds]),
  );
  const positioned = new Set((await positionsOf(client, appearances.map((a) => a.id))).map((p) => p.appearance_id));
  return new Set(appearances.filter((a) => positioned.has(a.id)).map((a) => a.fixture_id));
}

/** One player's own appearances this registration, with positions. */
export async function loadOwnMinutes(client: SupabaseClient, registrationId: string): Promise<readonly PlayedMinutes[]> {
  const appearances = unwrap<AppearanceRow[]>(
    'appearance',
    await client.from('appearance').select('*').eq('registration_id', registrationId),
  );
  return withPositions(appearances, await positionsOf(client, appearances.map((a) => a.id)));
}

export interface GameSheetPlayer {
  readonly personId: string;
  readonly name: string;
  readonly registrationId: string | null;
  readonly started: boolean;
  readonly positions: Readonly<Partial<Record<Line, number>>>;
}

export interface GameSheet {
  readonly fixture: FixtureRow;
  readonly teamName: string;
  readonly players: readonly GameSheetPlayer[];
}

/** One fixture, its team's players (not withdrawn), and what is recorded so far. */
export async function loadGameSheet(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
): Promise<GameSheet | null> {
  const fixture = unwrap<FixtureRow[]>(
    'fixture',
    await client.from('fixture').select('*').eq('club_id', clubId).eq('id', fixtureId).limit(1),
  )[0];
  if (fixture === undefined || fixture.team_id === null) return null;

  const [team, members] = await Promise.all([
    client.from('team').select('name').eq('id', fixture.team_id).limit(1),
    client
      .from('team_member')
      .select('person_id, withdrawn_at')
      .eq('club_id', clubId)
      .eq('team_id', fixture.team_id)
      .eq('role', 'player'),
  ]);
  const playerIds = unwrap<{ person_id: string; withdrawn_at: string | null }[]>('team_member', members)
    .filter((m) => m.withdrawn_at === null)
    .map((m) => m.person_id);
  if (playerIds.length === 0) {
    return { fixture, teamName: unwrap<{ name: string }[]>('team', team)[0]?.name ?? '', players: [] };
  }

  const [people, regs, apps] = await Promise.all([
    client.from('person').select('id, preferred_name, legal_given_names, legal_family_name').in('id', playerIds),
    client.from('registration').select('id, person_id').eq('club_id', clubId).eq('season_id', fixture.season_id).in('person_id', playerIds),
    client.from('appearance').select('*').eq('fixture_id', fixtureId),
  ]);
  const personRows = unwrap<
    { id: string; preferred_name: string | null; legal_given_names: string; legal_family_name: string }[]
  >('person', people);
  const regRows = unwrap<{ id: string; person_id: string }[]>('registration', regs);
  const appRows = unwrap<AppearanceRow[]>('appearance', apps);
  const posRows = await positionsOf(client, appRows.map((a) => a.id));

  const players = personRows
    .map((p) => {
      const app = appRows.find((a) => a.person_id === p.id);
      const positions: Partial<Record<Line, number>> = {};
      for (const r of posRows.filter((r) => r.appearance_id === app?.id)) positions[r.position] = r.minutes;
      return {
        personId: p.id,
        name: displayNameFor({
          preferredName: p.preferred_name,
          legalName: { givenNames: p.legal_given_names, familyName: p.legal_family_name },
        }),
        registrationId: regRows.find((r) => r.person_id === p.id)?.id ?? null,
        started: app?.started ?? false,
        positions,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return { fixture, teamName: unwrap<{ name: string }[]>('team', team)[0]?.name ?? '', players };
}

/**
 * Save a game's minutes by position: each player's appearance (minutes =
 * the positions' total; goals and assists untouched), then its positions
 * replaced. Stops at the first refusal and says which player.
 */
export async function saveGameTime(
  client: SupabaseClient,
  clubId: string,
  sheet: GameSheet,
  rows: readonly GameTimeRow[],
): Promise<string | null> {
  for (const row of rows) {
    const player = sheet.players.find((p) => p.personId === row.personId);
    if (player === undefined) continue;
    if (player.registrationId === null) {
      return `${player.name} has no registration this season, so no appearance can be recorded.`;
    }
    const upserted = await client
      .from('appearance')
      .upsert(
        {
          club_id: clubId,
          fixture_id: sheet.fixture.id,
          person_id: row.personId,
          registration_id: player.registrationId,
          minutes_played: totalMinutes(row),
          started: row.started,
        },
        { onConflict: 'fixture_id,person_id' },
      )
      .select('id')
      .single();
    if (upserted.error !== null) return `${player.name}: ${said(upserted.error)}`;
    const appearanceId = (upserted.data as { id: string }).id;

    const cleared = await client.from('appearance_position').delete().eq('appearance_id', appearanceId);
    if (cleared.error !== null) return `${player.name}: ${said(cleared.error)}`;
    const placed = LINES.flatMap((position) => {
      const minutes = row.positions[position] ?? 0;
      return minutes > 0 ? [{ club_id: clubId, appearance_id: appearanceId, position, minutes }] : [];
    });
    if (placed.length > 0) {
      const inserted = await client.from('appearance_position').insert(placed);
      if (inserted.error !== null) return `${player.name}: ${said(inserted.error)}`;
    }
  }
  return null;
}
