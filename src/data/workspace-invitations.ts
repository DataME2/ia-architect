/**
 * Record the workspace invitations a player's season calls for (scope 68
 * WP2) — one path for a single person and for the "invite all missing"
 * button. Returns the addresses to send links to; sending is the caller's,
 * because it needs the request's host.
 *
 * The rows go through `recordGuardianInvitation` / `recordPlayerInvitation`,
 * so the database's own BR126/BR150 triggers still stand behind every one.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { ageAt } from '../domain/types.ts';
import { displayNameFor } from '../web/queue-view.ts';
import { planWorkspaceInvites, type InvitePlan } from '../web/workspace-invite-view.ts';
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

export interface InviteOutcome {
  /** Addresses newly invited, to be sent a link. */
  readonly toSend: readonly string[];
  /** "Name (guardian)" for everyone who should be invited and has no email. */
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
  const players = await selectAll<{ person_id: string }>('person_role', (from, to) => {
    let q = client.from('person_role').select('person_id')
      .eq('club_id', clubId).eq('season_id', seasonId).eq('role', 'player');
    if (onlyPersonId !== null) q = q.eq('person_id', onlyPersonId);
    return q.range(from, to);
  });
  if (players.length === 0) return { toSend: [], missingEmail: [], noGuardian: [], errors: [] };

  const complete = new Set(
    (await selectAll<{ person_id: string }>('registration', (from, to) => {
      let q = client.from('registration').select('person_id')
        .eq('club_id', clubId).eq('season_id', seasonId).eq('status', 'COMPLETE');
      if (onlyPersonId !== null) q = q.eq('person_id', onlyPersonId);
      return q.range(from, to);
    })).map((r) => r.person_id),
  );

  const [people, guardianships, guardianInvites, playerInvites] = await Promise.all([
    selectAll<PersonRow>('person', (from, to) =>
      client.from('person').select('*').eq('club_id', clubId).range(from, to)),
    selectAll<{ person_id: string; guardian_person_id: string; is_authority: boolean }>(
      'guardianship', (from, to) =>
        client.from('guardianship').select('person_id, guardian_person_id, is_authority')
          .eq('club_id', clubId).range(from, to)),
    selectAll<{ guardian_person_id: string }>('guardian_invitation', (from, to) =>
      client.from('guardian_invitation').select('guardian_person_id').eq('club_id', clubId).range(from, to)),
    selectAll<{ person_id: string }>('player_invitation', (from, to) =>
      client.from('player_invitation').select('person_id').eq('club_id', clubId).range(from, to)),
  ]);

  const byId = new Map(people.map((p) => [p.id, p]));
  const guardianInvited = new Set(guardianInvites.map((g) => g.guardian_person_id));
  const playerInvited = new Set(playerInvites.map((p) => p.person_id));
  const candidate = (p: PersonRow, invited: boolean) => ({
    personId: p.id, name: displayNameFor(toPerson(p)), email: p.email, alreadyInvited: invited,
  });

  const toSend = new Set<string>();
  const missingEmail: string[] = [];
  const noGuardian: string[] = [];
  const errors: string[] = [];

  for (const { person_id } of players) {
    const player = byId.get(person_id);
    if (player === undefined) continue;

    const plan: InvitePlan = planWorkspaceInvites({
      age: ageAt(player.date_of_birth, today),
      isPlayerThisSeason: true,
      registrationComplete: complete.has(person_id),
      player: candidate(player, playerInvited.has(person_id)),
      authorityGuardians: guardianships
        .filter((g) => g.person_id === person_id && g.is_authority)
        .flatMap((g) => {
          const guardian = byId.get(g.guardian_person_id);
          return guardian === undefined ? [] : [candidate(guardian, guardianInvited.has(guardian.id))];
        }),
    });

    const name = displayNameFor(toPerson(player));
    if (plan.noGuardian) noGuardian.push(name);
    for (const m of plan.missingEmail) missingEmail.push(`${m.name} (${m.kind} of ${name})`);

    for (const r of plan.send) {
      const recorded = r.kind === 'guardian'
        ? await recordGuardianInvitation(client, clubId, r.personId, r.email, invitedByUserId)
        : await recordPlayerInvitation(client, clubId, r.personId, r.email, invitedByUserId);
      if ('error' in recorded) errors.push(`${name}: ${recorded.error}`);
      else if (!recorded.alreadyInvited) toSend.add(r.email);
      // A guardian of two players is invited once; the second is a no-op.
      if (r.kind === 'guardian') guardianInvited.add(r.personId);
      else playerInvited.add(r.personId);
    }
  }

  return { toSend: [...toSend], missingEmail, noGuardian, errors };
}
