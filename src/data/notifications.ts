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
