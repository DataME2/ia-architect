/**
 * The workspaces a player's season calls for (scope 68 WP2): recording the
 * invitations, and reading where each one stands. One loader serves both,
 * so what the Access screen shows is what `inviteWorkspaces` would send.
 *
 * Invitations go through `recordGuardianInvitation` /
 * `recordPlayerInvitation`, so the database's own BR126/BR150 triggers
 * still stand behind every row. Sending the link is the caller's, because
 * it needs the request's host.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { ageAt } from '../domain/types.ts';
import { displayNameFor } from '../web/queue-view.ts';
import {
  planWorkspaceInvites,
  workspaceRows,
  type WorkspaceHolder,
  type WorkspaceRow,
} from '../web/workspace-invite-view.ts';
import { recordGuardianInvitation } from './family.ts';
import { toPerson } from './mappers.ts';
import { recordPlayerInvitation } from './player-invitation.ts';
import { QueryError } from './queries.ts';
import type { PersonRow } from './schema.ts';

const PAGE = 1000;

/** Supabase returns at most 1,000 rows a request; a club-wide read pages past it. */
async function selectAll<T>(
  table: string,
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error !== null) throw new QueryError(table, error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}

interface Invitation {
  /** The login that claimed it, or null if nobody has yet. */
  readonly claimedBy: string | null;
}

interface PlayerSeason {
  readonly player: PersonRow;
  readonly name: string;
  readonly age: number;
  readonly complete: boolean;
  readonly isPlayer: boolean;
  /** Holds a referee role this season: an own workspace from 13 (scope 73). */
  readonly isReferee: boolean;
  readonly guardians: readonly PersonRow[];
}

interface WorkspaceData {
  readonly players: readonly PlayerSeason[];
  readonly guardianInvites: Map<string, Invitation>;
  readonly playerInvites: Map<string, Invitation>;
  /** People at this club with a login linked to them. */
  readonly linkedPersons: ReadonlySet<string>;
}

async function loadWorkspaceData(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  today: string,
  onlyPersonId: string | null,
): Promise<WorkspaceData> {
  const roleRows = await selectAll<{ person_id: string; role: string }>('person_role', (from, to) => {
    let q = client.from('person_role').select('person_id, role')
      .eq('club_id', clubId).eq('season_id', seasonId).in('role', ['player', 'referee']);
    if (onlyPersonId !== null) q = q.eq('person_id', onlyPersonId);
    return q.range(from, to);
  });
  const roles = new Map<string, Set<string>>();
  for (const r of roleRows) roles.set(r.person_id, (roles.get(r.person_id) ?? new Set()).add(r.role));
  if (roles.size === 0) {
    return { players: [], guardianInvites: new Map(), playerInvites: new Map(), linkedPersons: new Set() };
  }

  const [completeRows, people, guardianships, guardianInvites, playerInvites, links] = await Promise.all([
    selectAll<{ person_id: string }>('registration', (from, to) =>
      client.from('registration').select('person_id')
        .eq('club_id', clubId).eq('season_id', seasonId).eq('status', 'COMPLETE').range(from, to)),
    selectAll<PersonRow>('person', (from, to) =>
      client.from('person').select('*').eq('club_id', clubId).range(from, to)),
    selectAll<{ person_id: string; guardian_person_id: string; is_authority: boolean }>(
      'guardianship', (from, to) =>
        client.from('guardianship').select('person_id, guardian_person_id, is_authority')
          .eq('club_id', clubId).range(from, to)),
    selectAll<{ guardian_person_id: string; claimed_user_id: string | null }>('guardian_invitation', (from, to) =>
      client.from('guardian_invitation').select('guardian_person_id, claimed_user_id')
        .eq('club_id', clubId).range(from, to)),
    selectAll<{ person_id: string; claimed_user_id: string | null }>('player_invitation', (from, to) =>
      client.from('player_invitation').select('person_id, claimed_user_id').eq('club_id', clubId).range(from, to)),
    selectAll<{ user_id: string; person_id: string }>('account_person', (from, to) =>
      client.from('account_person').select('user_id, person_id').eq('club_id', clubId).range(from, to)),
  ]);

  const complete = new Set(completeRows.map((r) => r.person_id));
  const byId = new Map(people.map((p) => [p.id, p]));

  const players = [...roles].flatMap(([person_id, held]) => {
    const player = byId.get(person_id);
    if (player === undefined) return [];
    return [{
      player,
      name: displayNameFor(toPerson(player)),
      age: ageAt(player.date_of_birth, today),
      complete: complete.has(person_id),
      isPlayer: held.has('player'),
      isReferee: held.has('referee'),
      guardians: guardianships
        .filter((g) => g.person_id === person_id && g.is_authority)
        .flatMap((g) => {
          const guardian = byId.get(g.guardian_person_id);
          return guardian === undefined ? [] : [guardian];
        }),
    }];
  });

  return {
    players,
    guardianInvites: new Map(guardianInvites.map((g) => [g.guardian_person_id, { claimedBy: g.claimed_user_id }])),
    playerInvites: new Map(playerInvites.map((p) => [p.person_id, { claimedBy: p.claimed_user_id }])),
    linkedPersons: new Set(links.map((l) => l.person_id)),
  };
}

/**
 * "Claimed" alone is not "active": an invitation claimed by a login that has
 * since been unlinked leaves the Person locked out — which the screen once
 * showed as active while the workspace showed nothing.
 */
function holder(
  p: PersonRow,
  invite: Invitation | undefined,
  linkedPersons: ReadonlySet<string>,
): WorkspaceHolder {
  const claimedBy = invite?.claimedBy ?? null;
  // The workspace works through the link, not the invitation: a Person whose
  // login is linked is in, however that link was made (a password sign-in
  // never marked the invitation opened, so it read "link sent" for someone
  // using the workspace every day).
  const anyLoginLinked = linkedPersons.has(p.id);
  return {
    personId: p.id,
    name: displayNameFor(toPerson(p)),
    email: p.email,
    invited: invite !== undefined,
    claimed: anyLoginLinked,
    linkLost: claimedBy !== null && !anyLoginLinked,
  };
}

export interface PlayerWorkspaces {
  readonly playerName: string;
  readonly rows: readonly WorkspaceRow[];
}

/** Where every workspace this season calls for stands — read-only. */
export async function loadWorkspaceStatus(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  today: string,
): Promise<PlayerWorkspaces[]> {
  const data = await loadWorkspaceData(client, clubId, seasonId, today, null);
  return data.players
    .map((p) => ({
      playerName: p.name,
      rows: workspaceRows({
        age: p.age,
        registrationComplete: p.complete,
        isPlayer: p.isPlayer,
        isReferee: p.isReferee,
        player: holder(p.player, data.playerInvites.get(p.player.id), data.linkedPersons),
        authorityGuardians: p.guardians.map((g) => holder(g, data.guardianInvites.get(g.id), data.linkedPersons)),
      }),
    }))
    .filter((p) => p.rows.length > 0)
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

export interface InviteOutcome {
  /** Addresses newly invited, to be sent a link. */
  readonly toSend: readonly string[];
  /** "Name (guardian of X)" for everyone who should be invited and has no email. */
  readonly missingEmail: readonly string[];
  /** Players under 18 with nobody holding authority for them. */
  readonly noGuardian: readonly string[];
  readonly errors: readonly string[];
}

export async function inviteWorkspaces(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  invitedByUserId: string,
  today: string,
  onlyPersonId: string | null = null,
): Promise<InviteOutcome> {
  const data = await loadWorkspaceData(client, clubId, seasonId, today, onlyPersonId);

  const toSend = new Set<string>();
  const missingEmail: string[] = [];
  const noGuardian: string[] = [];
  const errors: string[] = [];

  for (const p of data.players) {
    const toCandidate = (h: WorkspaceHolder) => ({ ...h, alreadyInvited: h.invited });
    const plan = planWorkspaceInvites({
      age: p.age,
      isPlayerThisSeason: p.isPlayer,
      isRefereeThisSeason: p.isReferee,
      registrationComplete: p.complete,
      player: toCandidate(holder(p.player, data.playerInvites.get(p.player.id), data.linkedPersons)),
      authorityGuardians: p.guardians.map((g) => toCandidate(holder(g, data.guardianInvites.get(g.id), data.linkedPersons))),
    });

    if (plan.noGuardian) noGuardian.push(p.name);
    for (const m of plan.missingEmail) missingEmail.push(`${m.name} (${m.kind} of ${p.name})`);

    for (const r of plan.send) {
      const recorded = r.kind === 'guardian'
        ? await recordGuardianInvitation(client, clubId, r.personId, r.email, invitedByUserId)
        : await recordPlayerInvitation(client, clubId, r.personId, r.email, invitedByUserId);
      if ('error' in recorded) errors.push(`${p.name}: ${recorded.error}`);
      else if (!recorded.alreadyInvited) toSend.add(r.email);
      // A guardian of two players is invited once; the second is a no-op.
      (r.kind === 'guardian' ? data.guardianInvites : data.playerInvites).set(r.personId, { claimedBy: null });
    }
  }

  return { toSend: [...toSend], missingEmail, noGuardian, errors };
}
