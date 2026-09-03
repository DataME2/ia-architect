/**
 * Teams, rosters, and the clearances that decide who may stand in front of
 * a team.
 *
 * Reading a roster is open to any club member — a coach needs their own
 * squad. Reading a *clearance* is not: it carries a card number and is a
 * safeguarding record, so the policy narrows it to admin and registrar.
 * That asymmetry is in `0010_teams_and_clearances.sql`, not here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { mayHoldRole } from '../domain/teams/clearance.ts';
import type { Clearance, Team, TeamRole } from '../domain/teams/types.ts';
import { ageAt, type IsoDate, type Person } from '../domain/types.ts';
import { toClearance, toPerson, toTeam } from './mappers.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { ClearanceRow, PersonRow, TeamMemberRow, TeamRow } from './schema.ts';
import { buildRoster, type Roster, type RosterEntry } from '../web/team-view.ts';
import { displayNameFor, fullLegalName } from '../web/queue-view.ts';

const CLEARANCE_BUCKET = 'clearances';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface TeamWithRoster {
  readonly team: Team;
  readonly roster: Roster;
}

/**
 * Every team in a season, with its roster assembled.
 *
 * One query per table then joined in memory, the same shape as the queue:
 * a club with twenty teams would otherwise be twenty round trips on the
 * screen a coordinator opens most.
 */
export async function loadTeams(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  seasonEndsOn: IsoDate,
): Promise<readonly TeamWithRoster[]> {
  const teamRows = unwrap<TeamRow[]>(
    'team',
    await client
      .from('team')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .order('name'),
  );
  if (teamRows.length === 0) return [];

  const memberRows = unwrap<TeamMemberRow[]>(
    'team_member',
    await client
      .from('team_member')
      .select('*')
      .eq('club_id', clubId)
      .in('team_id', teamRows.map((t) => t.id)),
  );

  const personIds = [...new Set(memberRows.map((m) => m.person_id))];
  const people =
    personIds.length === 0
      ? []
      : unwrap<PersonRow[]>(
          'person',
          await client.from('person').select('*').eq('club_id', clubId).in('id', personIds),
        );
  const byId = new Map(people.map((p) => [p.id, toPerson(p)]));

  // Clearances may be unreadable to this caller — a coordinator or coach can
  // see the roster but not the card numbers — and that is a policy decision,
  // not an error. An empty list simply means every official reads as
  // unverified to them, which is the safe way round.
  const clearanceRows = await client
    .from('clearance')
    .select('*')
    .eq('club_id', clubId)
    .in('person_id', personIds.length === 0 ? ['00000000-0000-0000-0000-000000000000'] : personIds);
  const clearances = (clearanceRows.data ?? []).map((row) => toClearance(row as ClearanceRow));

  const clearancesFor = (personId: string): readonly Clearance[] =>
    clearances.filter((c) => c.personId === personId);

  return teamRows.map((teamRow) => {
    const entries: RosterEntry[] = [];
    for (const member of memberRows.filter((m) => m.team_id === teamRow.id)) {
      const person = byId.get(member.person_id);
      if (person === undefined) continue;
      entries.push({
        memberId: member.id,
        personId: person.id,
        displayName: displayNameFor(person),
        legalName: fullLegalName(person),
        role: member.role,
        clearance: mayHoldRole(member.role, clearancesFor(person.id), seasonEndsOn),
      });
    }
    return { team: toTeam(teamRow), roster: buildRoster(entries) };
  });
}

export async function createTeam(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  name: string,
  ageGroup: string | null,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('team')
    .insert({ club_id: clubId, season_id: seasonId, name, age_group: ageGroup });
  if (error !== null) throw new QueryError('team', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'team_created',
    entity: 'team',
    entityId: null,
    detail: { seasonId, name, ageGroup },
  });
}

export type MemberResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

/**
 * Add someone to a team.
 *
 * The database refuses an uncleared official outright (BR83, by trigger),
 * so this does not need to check — but it translates the refusal into
 * something a registrar can act on. A safeguarding rule that surfaces as a
 * 500 teaches people to click again rather than to go and check the card.
 */
export async function addTeamMember(
  client: SupabaseClient,
  clubId: string,
  teamId: string,
  personId: string,
  role: TeamRole,
  actorUserId: string,
): Promise<MemberResult> {
  const { error } = await client.from('team_member').insert({
    club_id: clubId,
    team_id: teamId,
    person_id: personId,
    role,
    added_by_user_id: actorUserId,
  });

  if (error !== null) {
    if (error.message.includes('no card, no start')) {
      return {
        ok: false,
        error: 'No verified Working with Children Check is recorded for them. No card, no start (BR19) — record and verify the card first.',
      };
    }
    if (error.message.includes('before the season ends')) {
      return {
        ok: false,
        error: `Their clearance runs out before this season does (BR54). ${error.message.replace(/^.*?their clearance/i, 'Their clearance')}`,
      };
    }
    if (error.message.includes('team_member_team_id_person_id_role_key')) {
      return { ok: false, error: 'They already hold that role in this team.' };
    }
    return { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'team_member_added',
    entity: 'team_member',
    entityId: personId,
    detail: { teamId, role, rules: role === 'player' ? [] : ['BR19', 'BR54', 'BR83'] },
  });

  return { ok: true };
}

export async function removeTeamMember(
  client: SupabaseClient,
  clubId: string,
  memberId: string,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('team_member')
    .delete()
    .eq('id', memberId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('team_member', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'team_member_removed',
    entity: 'team_member',
    entityId: memberId,
    detail: {},
  });
}

/** Every clearance the club holds for one person. */
export async function loadClearances(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<readonly Clearance[]> {
  const rows = unwrap<ClearanceRow[]>(
    'clearance',
    await client
      .from('clearance')
      .select('*')
      .eq('club_id', clubId)
      .eq('person_id', personId)
      .order('expires_on', { ascending: false }),
  );
  return rows.map(toClearance);
}

/**
 * Record a clearance, and whether a human actually checked it.
 *
 * `verified` is a separate argument from the card number on purpose. BR19
 * is not satisfied by holding a number — someone has to have looked it up
 * on the state's portal — and collapsing the two would let a typed number
 * clear a coach.
 */
export async function recordClearance(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  input: {
    readonly kind: string;
    readonly identifier: string;
    readonly issuedOn: IsoDate | null;
    readonly expiresOn: IsoDate;
    readonly verified: boolean;
    /** A scan of the card. The number is a transcription; this is evidence. */
    readonly file: File | null;
  },
  actorUserId: string,
): Promise<MemberResult> {
  const now = new Date().toISOString();

  let filePath: string | null = null;
  if (input.file !== null && input.file.size > 0) {
    // Same path convention as vouchers -- club id first, checked by the
    // policy -- but a narrower bucket: this is a government identity
    // document, readable only by admin and registrar.
    const extension = input.file.type === 'application/pdf' ? 'pdf' : 'img';
    filePath = `${clubId}/${personId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(CLEARANCE_BUCKET)
      .upload(filePath, input.file, { contentType: input.file.type, upsert: false });
    if (uploadError !== null) {
      return { ok: false, error: `The scan could not be stored: ${uploadError.message}` };
    }
  }

  const { error } = await client.from('clearance').insert({
    file_path: filePath,
    club_id: clubId,
    person_id: personId,
    kind: input.kind,
    identifier: input.identifier,
    issued_on: input.issuedOn,
    expires_on: input.expiresOn,
    verified_by_user_id: input.verified ? actorUserId : null,
    verified_at: input.verified ? now : null,
  });
  if (error !== null) {
    if (error.message.includes('clearance_club_id_person_id_kind_identifier_key')) {
      return { ok: false, error: 'That card is already recorded for this person.' };
    }
    return { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: input.verified ? 'clearance_verified' : 'clearance_recorded',
    entity: 'clearance',
    entityId: personId,
    detail: {
      kind: input.kind,
      expiresOn: input.expiresOn,
      hasScan: filePath !== null,
      rule: 'BR19',
    },
  });

  return { ok: true };
}

/**
 * People the screen can offer.
 *
 * `adultsOnly` is not cosmetic. A committee position may only be held by an
 * adult (BR87), and a child is exempt from needing a Working with Children
 * Check at all (BR84) — so offering a nine-year-old on either form invites
 * a registrar to record something that cannot be true. The screens that
 * pick a *player* pass `false` and see everyone.
 */
export async function loadAssignablePeople(
  client: SupabaseClient,
  clubId: string,
  options: { readonly adultsOnly?: boolean; readonly asAt?: IsoDate } = {},
): Promise<readonly Person[]> {
  const rows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .is('merged_into_person_id', null),
  );

  const people = rows.map(toPerson);
  if (options.adultsOnly !== true) return people;

  const asAt = options.asAt ?? new Date().toISOString().slice(0, 10);
  return people.filter((person) => ageAt(person.dateOfBirth, asAt) >= 18);
}

/** A short-lived link to a stored card scan. The bucket is private. */
export async function clearanceFileUrl(
  client: SupabaseClient,
  filePath: string,
): Promise<string | null> {
  const { data, error } = await client.storage
    .from(CLEARANCE_BUCKET)
    .createSignedUrl(filePath, 300);
  return error !== null || data === null ? null : data.signedUrl;
}

/**
 * How far each person's clearance reaches, keyed by person.
 *
 * `null` — or simply absent — means none that counts: no card, or one
 * nobody verified, or one that was revoked. Used to surface BR88's gap on
 * the governance screen without blocking anything.
 *
 * A caller who may not read clearances (a coordinator, a treasurer) gets an
 * empty map rather than an error, which reads as "no clearance" — the safe
 * way round for a screen that is warning about missing ones.
 */
export async function loadClearanceCoverage(
  client: SupabaseClient,
  clubId: string,
): Promise<ReadonlyMap<string, IsoDate>> {
  const { data } = await client
    .from('clearance')
    .select('person_id, expires_on, verified_at, revoked_at')
    .eq('club_id', clubId)
    .is('revoked_at', null)
    .not('verified_at', 'is', null);

  const best = new Map<string, IsoDate>();
  for (const row of (data ?? []) as { person_id: string; expires_on: string }[]) {
    const held = best.get(row.person_id);
    if (held === undefined || row.expires_on > held) best.set(row.person_id, row.expires_on);
  }
  return best;
}
