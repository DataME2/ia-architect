/**
 * The notifications the rules have been asking for.
 *
 * Three rules have been unbuildable since the business layer was drafted,
 * for want of anything that sends: BR42's coordinator notification, BR64's
 * fixture change, and telling an official their claim was approved — today
 * they find out by being paid.
 *
 * Each is one function here. Each resolves its own recipient, composes a
 * template, and goes through `sendMessage`, so suppression is honoured and
 * the outcome is logged (BR127–BR129) exactly as it is for a reminder.
 *
 * **Two of the three have no caller yet, and that is stated rather than
 * hidden.** `notifyFixtureChanged` fires from a fixture being edited and
 * nothing in the application edits one — `fixture` has a create path and no
 * update path. `notifyClaimApproved` fires from a treasurer approving a
 * claim, which [scope 34](../../docs/scope/34_paying_the_officials.md)
 * delivered in the database and not on a screen. Building those two screens
 * is their own slices' work, not this one's; the notification is ready for
 * the day they land, and until then it is dead code that says so.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { claimApproved, fixtureChange, officialWithdrew } from '../domain/messaging/templates.ts';
import type { MessageTemplate } from '../domain/messaging/types.ts';
import { addresseesFor } from '../domain/messaging/recipients.ts';
import type { IsoDate, Person } from '../domain/types.ts';
import { todayIn } from '../web/today.ts';
import { sendMessage, subscriberFor, toRecipient, unsubscribeUrlFor } from './messaging.ts';
import type { SendResult } from './messaging.ts';

export interface Party {
  readonly personId: string;
  readonly email: string;
  readonly name: string;
}

/**
 * The shared spine: subscriber, link, compose, send, log.
 *
 * Extracted because the three notifications differ only in template and
 * input — and because a second copy of this sequence is where the
 * suppression check eventually gets forgotten.
 */
async function notify<TInput>(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  to: Party,
  template: MessageTemplate<TInput>,
  input: TInput,
  aboutPersonId: string | null,
): Promise<SendResult> {
  const subscriber = await subscriberFor(client, clubId, to.personId, to.email);
  if (subscriber === null) {
    return { outcome: 'failed', detail: 'Could not record them as contactable.' };
  }

  const unsubscribeUrl = unsubscribeUrlFor(subscriber.id, subscriber.unsubscribe_salt);
  const { subject, body } = template.compose(input, { clubName, unsubscribeUrl, asAt: todayIn() });

  return sendMessage(client, clubId, toRecipient(subscriber, to.name), {
    templateKey: template.key,
    templateVersion: template.version,
    purpose: template.purpose,
    subject,
    body,
    unsubscribeUrl,
    aboutPersonId,
  });
}

/**
 * BR42 — a withdrawal after acceptance reaches the Referee Coordinator.
 *
 * Only after acceptance. A decline before it is an ordinary answer to a
 * proposal and needs no alarm; a withdrawal leaves a fixture without an
 * official, which is someone's problem this afternoon.
 */
export async function notifyOfficialWithdrew(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  coordinator: Party,
  officialName: string,
  officialPersonId: string,
  fixture: string,
  reason: string,
): Promise<SendResult> {
  return notify(client, clubId, clubName, coordinator, officialWithdrew, {
    coordinatorName: coordinator.name,
    officialName,
    fixture,
    reason,
  }, officialPersonId);
}

/** BR64 — every affected participant, and the club's record stays the truth. */
export async function notifyFixtureChanged(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  participants: readonly Party[],
  fixture: { readonly opponent: string; readonly kickOff: string; readonly venue: string },
  whatChanged: string,
): Promise<readonly SendResult[]> {
  const results: SendResult[] = [];
  for (const participant of participants) {
    results.push(
      await notify(client, clubId, clubName, participant, fixtureChange, {
        recipientName: participant.name,
        opponent: fixture.opponent,
        kickOff: fixture.kickOff,
        venue: fixture.venue,
        whatChanged,
      }, participant.personId),
    );
  }
  return results;
}

/** The official stops finding out by being paid. */
export async function notifyClaimApproved(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  official: Party,
  fixture: string,
  amount: string,
): Promise<SendResult> {
  return notify(client, clubId, clubName, official, claimApproved, {
    officialName: official.name,
    fixture,
    amount,
  }, official.personId);
}

/**
 * The club's referee coordinator, as somebody who can be emailed.
 *
 * Membership says who holds the role; `account_person` says which Person
 * that account is (BR107) — and only a linked account has a Person with an
 * address on it. An unlinked coordinator is not a failure, it is the state
 * decision 10 insists on making visible: the platform does not know who
 * they are, so it cannot write to them.
 *
 * Returns the first, not all. A club with two coordinators telling both is
 * a reasonable future change; a club with none is the case worth handling
 * now, and it returns null rather than throwing.
 */
export async function loadCoordinator(
  client: SupabaseClient,
  clubId: string,
): Promise<Party | null> {
  const memberships = await client
    .from('club_membership')
    .select('user_id')
    .eq('club_id', clubId)
    .eq('role', 'coordinator');

  const userIds = (memberships.data ?? []).map((m: { user_id: string }) => m.user_id);
  if (userIds.length === 0) return null;

  const links = await client
    .from('account_person')
    .select('person_id')
    .eq('club_id', clubId)
    .in('user_id', userIds);

  const personIds = (links.data ?? []).map((l: { person_id: string }) => l.person_id);
  if (personIds.length === 0) return null;

  const people = await client
    .from('person')
    .select('id, preferred_name, legal_given_names, legal_family_name, email')
    .eq('club_id', clubId)
    .in('id', personIds)
    .not('email', 'is', null);

  const person = (people.data ?? [])[0];
  if (person === undefined) return null;

  return {
    personId: person.id,
    email: person.email,
    name: `${person.preferred_name ?? person.legal_given_names} ${person.legal_family_name}`,
  };
}

// ------------------------------------------------------- fixture participants

export interface FixtureNotice {
  readonly opponent: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly venue: string | null;
  readonly status: string;
  readonly teamId: string | null;
}

/** The fixture as it stands, for comparing against what it becomes. */
export async function loadFixtureForNotice(
  client: SupabaseClient,
  clubId: string,
  fixtureId: string,
): Promise<FixtureNotice | null> {
  const { data } = await client
    .from('fixture')
    .select('opponent, played_on, kick_off, venue, status, team_id')
    .eq('club_id', clubId)
    .eq('id', fixtureId)
    .maybeSingle();

  if (data === null) return null;
  const r = data as Record<string, unknown>;
  return {
    opponent: r.opponent as string,
    playedOn: r.played_on as string,
    kickOff: r.kick_off as string | null,
    venue: r.venue as string | null,
    status: r.status as string,
    teamId: r.team_id as string | null,
  };
}

/**
 * Everyone a fixture change reaches (BR64), and what happened to each.
 *
 * Two groups: the officials designated to it, and the members of the team
 * contesting it. Each is resolved through `addresseesFor`, so a minor's
 * message goes to their guardians rather than to them — the same routing
 * BR1 and BR67 already define, rather than a second idea of who is
 * responsible.
 *
 * Returns a sentence for the registrar, never throws: a fixture that saved
 * and was not announced is recoverable, and BR64 makes the platform's
 * record authoritative over any notified copy anyway.
 */
export async function notifyFixtureParticipants(
  client: SupabaseClient,
  tenant: { readonly clubId: string; readonly clubName: string },
  fixtureId: string,
  fixture: FixtureNotice,
  whatChanged: string,
): Promise<string> {
  const [officials, teamMembers] = await Promise.all([
    client.from('match_official_appointment')
      .select('person_id').eq('club_id', tenant.clubId).eq('fixture_id', fixtureId)
      .in('state', ['proposed', 'accepted']),
    fixture.teamId === null
      ? Promise.resolve({ data: [] })
      : client.from('team_member').select('person_id').eq('club_id', tenant.clubId).eq('team_id', fixture.teamId),
  ]);

  const personIds = [...new Set([
    ...((officials.data ?? []) as { person_id: string }[]).map((r) => r.person_id),
    ...((teamMembers.data ?? []) as { person_id: string }[]).map((r) => r.person_id),
  ])];

  if (personIds.length === 0) return 'Nobody is recorded as involved, so nobody was told.';

  const [{ data: people }, { data: guardianships }] = await Promise.all([
    client.from('person')
      .select('id, club_id, legal_given_names, legal_family_name, preferred_name, date_of_birth, email')
      .eq('club_id', tenant.clubId).in('id', personIds),
    client.from('guardianship')
      .select('person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', tenant.clubId).in('person_id', personIds),
  ]);

  // Guardians are Persons too, and may not be among the participants — so
  // they are fetched alongside rather than assumed present.
  const guardianIds = ((guardianships ?? []) as { guardian_person_id: string }[])
    .map((g) => g.guardian_person_id);
  const { data: guardianPeople } = guardianIds.length === 0
    ? { data: [] }
    : await client.from('person')
        .select('id, club_id, legal_given_names, legal_family_name, preferred_name, date_of_birth, email')
        .eq('club_id', tenant.clubId).in('id', guardianIds);

  const byId = new Map<string, Person>();
  for (const row of [...(people ?? []), ...(guardianPeople ?? [])] as Record<string, unknown>[]) {
    byId.set(row.id as string, {
      id: row.id as string,
      clubId: row.club_id as string,
      legalName: {
        givenNames: row.legal_given_names as string,
        familyName: row.legal_family_name as string,
      },
      legalNameVerifiedAt: null,
      preferredName: row.preferred_name as string | null,
      dateOfBirth: row.date_of_birth as IsoDate,
      email: row.email as string | null,
    } as Person);
  }

  const links = ((guardianships ?? []) as Record<string, unknown>[]).map((g) => ({
    personId: g.person_id as string,
    guardianPersonId: g.guardian_person_id as string,
    isAuthority: g.is_authority as boolean,
    isContact: g.is_contact as boolean,
  }));

  // One message per addressee, not per participant: a parent of two players
  // in the same team is told once.
  const addressees = new Map<string, { personId: string; email: string; name: string }>();
  for (const personId of personIds) {
    const subject = byId.get(personId);
    if (subject === undefined) continue;
    for (const a of addresseesFor(subject, links, byId)) {
      addressees.set(a.personId, { personId: a.personId, email: a.email, name: a.displayName });
    }
  }

  if (addressees.size === 0) return 'No email address is recorded for anyone involved.';

  let sent = 0;
  const withheld: string[] = [];
  for (const party of addressees.values()) {
    const result = await notifyFixtureChanged(
      client, tenant.clubId, tenant.clubName, [party],
      {
        opponent: fixture.opponent,
        kickOff: fixture.kickOff ?? fixture.playedOn,
        venue: fixture.venue ?? 'to be confirmed',
      },
      whatChanged,
    );
    if (result[0]?.outcome === 'sent') sent += 1;
    else withheld.push(`${party.name} — ${result[0]?.detail ?? 'not sent'}`);
  }

  if (withheld.length === 0) return `${sent} ${sent === 1 ? 'person was' : 'people were'} told.`;
  return `${sent} told. Not told: ${withheld.join('; ')}.`;
}
