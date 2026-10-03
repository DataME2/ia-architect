/**
 * What is waiting on the signed-in account, synchronised into its own inbox
 * (BR159, scope 72, migration 0067).
 *
 * Every "is this waiting" decision is made by a loader a workspace already
 * uses (BR62, BR113, BR149, BR151, BR152), so the bell cannot disagree with
 * the panel it points to. This file only walks the account's club links,
 * asks those loaders, and hands the result to `app_sync_waiting`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { ageAt } from '../domain/types.ts';
import { awaitingAnswer } from '../web/designation-answer.ts';
import { nextFixture } from '../web/me-view.ts';
import { needsAvailabilityAnswer } from '../web/participation-answer.ts';
import {
  STAFF_WAITING_KINDS,
  WAITING_KINDS,
  availabilityItem,
  claimItem,
  correctionItem,
  designationItem,
  matchItem,
  type Answering,
  type WaitingItem,
  type WaitingKind,
} from '../web/waiting.ts';
import { loadSettleableClaims } from './claims.ts';
import { loadFamilyDesignations } from './designations.ts';
import { loadConfirmableAppointments } from './match-confirmation.ts';
import { loadChildren, loadMyTeams, loadTeamFixtures, type ClubLink, type MeSnapshot } from './me.ts';
import { loadParticipationResponse } from './participation.ts';

/** BR125's five, from `player_record_correction_select_officer` (0052). */
const CORRECTION_CONFIRMERS: readonly string[] = ['admin', 'registrar', 'coordinator', 'coach', 'technical_director'];

function nameOf(p: { readonly preferredName: string | null; readonly legalName: { readonly givenNames: string; readonly familyName: string } }): string {
  return `${p.preferredName ?? p.legalName.givenNames} ${p.legalName.familyName}`;
}

/** BR149: every pending correction at a club, for a role that confirms them. */
export async function collectCorrections(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly WaitingItem[]> {
  const { data, error } = await client
    .from('player_record_correction')
    .select('id, registration_id, person_id')
    .eq('club_id', clubId)
    .eq('state', 'pending');
  if (error !== null) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; registration_id: string; person_id: string }[];
  if (rows.length === 0) return [];

  const { data: people, error: peopleError } = await client
    .from('person')
    .select('id, preferred_name, legal_given_names, legal_family_name')
    .eq('club_id', clubId)
    .in('id', rows.map((r) => r.person_id));
  if (peopleError !== null) throw new Error(peopleError.message);
  const name = new Map(
    ((people ?? []) as { id: string; preferred_name: string | null; legal_given_names: string; legal_family_name: string }[])
      .map((p) => [p.id, `${p.preferred_name ?? p.legal_given_names} ${p.legal_family_name}`]),
  );
  return rows.map((r) =>
    correctionItem(clubId, {
      correctionId: r.id,
      registrationId: r.registration_id,
      playerName: name.get(r.person_id) ?? 'A player',
    }),
  );
}

/** BR62: the next fixture of this person's team, if nobody has answered for it. */
async function availabilityFor(
  client: SupabaseClient,
  link: ClubLink,
  person: { readonly id: string; readonly name: string },
  who: Answering,
  today: string,
): Promise<WaitingItem | null> {
  if (link.season === null) return null;
  const teams = await loadMyTeams(client, link.clubId, link.season.id, person.id);
  const team = teams.find((t) => t.role === 'player');
  if (team === undefined) return null;
  const next = nextFixture(await loadTeamFixtures(client, link.clubId, link.season.id, team.team.id), today);
  if (next === null) return null;
  const response = await loadParticipationResponse(client, link.clubId, next.id, person.id);
  if (!needsAvailabilityAnswer(true, response !== null)) return null;
  return availabilityItem(
    link.clubId,
    { fixtureId: next.id, personId: person.id, name: person.name, opponent: next.opponent, playedOn: next.playedOn },
    who,
  );
}

/** BR113: designations proposed to this person that `who` answers. */
async function designationsFor(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  who: Answering,
  today: string,
): Promise<readonly WaitingItem[]> {
  const { offered } = await loadFamilyDesignations(client, clubId, [personId], today);
  return awaitingAnswer(offered)
    // BR113 (scope 73): the official from thirteen, a guardian under eighteen.
    // From thirteen to seventeen both are told, and the first answer stands.
    .filter((o) => (who.self ? o.answersForThemselves : o.answeredByAnAdult))
    .map((o) =>
      designationItem(
        clubId,
        { appointmentId: o.id, officialName: o.officialName, role: o.role, opponent: o.opponent, playedOn: o.playedOn },
        who,
      ),
    );
}

/** Everything waiting on this account at one club it is linked to as a Person. */
async function collectForLink(client: SupabaseClient, link: ClubLink, today: string): Promise<readonly WaitingItem[]> {
  const items: WaitingItem[] = [];

  if (link.membershipRoles.some((r) => CORRECTION_CONFIRMERS.includes(r))) {
    items.push(...(await collectCorrections(client, link.clubId)));
  }

  // The account's own items, where it answers for itself, all from thirteen:
  // designations and match confirmations (scope 73), Saturday availability
  // and an unsettled claim (question 80 (C), scope 78).
  const age = ageAt(link.person.dateOfBirth, today);
  if (age >= 13) {
    const self = { id: link.personId, name: nameOf(link.person) };
    const own = await availabilityFor(client, link, self, { self: true }, today);
    if (own !== null) items.push(own);
    for (const c of await loadSettleableClaims(client, link.clubId, [link.personId])) {
      if (c.settlement === null) items.push(claimItem(link.clubId, { ...c, claimId: c.id }, { self: true }));
    }
    items.push(...(await designationsFor(client, link.clubId, link.personId, { self: true }, today)));
    for (const m of await loadConfirmableAppointments(client, link.clubId, [link.personId], today, 'self')) {
      if (!m.confirmed) items.push(matchItem(link.clubId, m, { self: true }));
    }
  }

  // The children it holds authority over (BR1, BR63).
  const children = await loadChildren(client, link.clubId, link.personId);
  const childIds = children.map((c) => c.id);
  for (const child of children) {
    const who: Answering = { self: false, childId: child.id };
    const answer = await availabilityFor(client, link, { id: child.id, name: nameOf(child) }, who, today);
    if (answer !== null) items.push(answer);
    items.push(...(await designationsFor(client, link.clubId, child.id, who, today)));
  }
  for (const m of await loadConfirmableAppointments(client, link.clubId, childIds, today, 'guardian')) {
    if (!m.confirmed) items.push(matchItem(link.clubId, m, { self: false, childId: m.personId }));
  }
  for (const c of await loadSettleableClaims(client, link.clubId, childIds)) {
    if (c.settlement === null) {
      items.push(claimItem(link.clubId, { ...c, claimId: c.id }));
    }
  }
  return items;
}

/**
 * Brings the account's inbox into line for these clubs and kinds. Quiet on
 * failure, like `loadNotifications`: the bell is "what was true when the page
 * rendered", and a sync that could not run leaves yesterday's bell in place
 * rather than taking the page down.
 */
export async function syncWaiting(
  client: SupabaseClient,
  clubIds: readonly string[],
  kinds: readonly WaitingKind[],
  items: readonly WaitingItem[],
): Promise<void> {
  if (clubIds.length === 0) return;
  await client.rpc('app_sync_waiting', {
    p_club_ids: [...clubIds],
    p_kinds: [...kinds],
    p_items: items.map((i) => ({
      club_id: i.clubId,
      kind: i.kind,
      subject_key: i.subjectKey,
      headline: i.headline,
      detail: i.detail,
      link_path: i.linkPath,
    })),
  });
}

/**
 * `/me`: every kind, at every club the account is linked to as a Person.
 *
 * A read that fails stops the whole sync rather than syncing what it did
 * read: a partial list would retire the items it failed to see. (Some of the
 * workspace loaders turn a failure into an empty list themselves. An item
 * retired that way is reopened by the next sync that sees it, which is why
 * 0067 reopens rather than deletes.)
 */
export async function syncEverythingWaiting(client: SupabaseClient, me: MeSnapshot, today: string): Promise<void> {
  try {
    const items: WaitingItem[] = [];
    for (const link of me.links) items.push(...(await collectForLink(client, link, today)));
    await syncWaiting(client, me.links.map((l) => l.clubId), WAITING_KINDS, items);
  } catch {
    // ponytail: a failed read skips this sync; the bell keeps its last state.
  }
}

/** Club screens: only the staff kind, for the club on screen. */
export async function syncStaffWaiting(
  client: SupabaseClient,
  clubId: string,
  membershipRoles: readonly string[],
): Promise<void> {
  try {
    const items = membershipRoles.some((r) => CORRECTION_CONFIRMERS.includes(r))
      ? await collectCorrections(client, clubId)
      : [];
    await syncWaiting(client, [clubId], STAFF_WAITING_KINDS, items);
  } catch {
    // Same as above: the club screen renders with the bell it already had.
  }
}
