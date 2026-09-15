/**
 * Telling a family what is outstanding.
 *
 * The flow this whole initiative pays for: forty families, one screen, one
 * send each, recorded. Everything it needs is already on the registration —
 * the rule outcomes *are* the message (BR127, BR131).
 *
 * Orchestration only. What the message says is `src/domain/messaging/`,
 * whether it may be sent is the suppression rule, and how it leaves the
 * building is `messaging.ts`. This module joins them to a registration.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { guardianReminder } from '../domain/messaging/templates.ts';
import type { RuleOutcome } from '../domain/rules/types.ts';
import { todayIn } from '../web/today.ts';
import { loadGuardianCandidates } from './family.ts';
import { sendMessage, subscriberFor, toRecipient, unsubscribeUrlFor } from './messaging.ts';

export interface ReminderOutcome {
  readonly to: string;
  readonly outcome: 'sent' | 'suppressed' | 'failed';
  readonly detail: string | null;
}

/**
 * Remind every authoritative guardian of one child.
 *
 * Guardians rather than the child, always: `loadGuardianCandidates` returns
 * only `is_authority` rows, which already expire at eighteen (BR67), so
 * this needs no age check of its own — and gets none, because a second
 * definition of "who is responsible" would eventually disagree with the
 * first.
 *
 * Returns one outcome per guardian instead of a single verdict, because
 * "sent to one and suppressed for the other" is the common case in a
 * household and a screen that averages it tells the registrar nothing.
 */
export async function sendRegistrationReminder(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
  childPersonId: string,
  childName: string,
  outcomes: readonly RuleOutcome[],
): Promise<readonly ReminderOutcome[]> {
  const guardians = await loadGuardianCandidates(client, clubId, childPersonId);
  const results: ReminderOutcome[] = [];

  for (const guardian of guardians) {
    const email = guardian.email?.trim() ?? '';
    if (email === '') {
      // Not a failure to log against a subscriber who does not exist: there
      // is nobody to write to, and the registrar needs to know that plainly.
      results.push({
        to: guardian.name,
        outcome: 'failed',
        detail: 'No email address is recorded for them.',
      });
      continue;
    }

    const subscriber = await subscriberFor(client, clubId, guardian.personId, email);
    if (subscriber === null) {
      results.push({ to: email, outcome: 'failed', detail: 'Could not record them as contactable.' });
      continue;
    }

    const recipient = toRecipient(subscriber, guardian.name);
    const unsubscribeUrl = unsubscribeUrlFor(subscriber.id, subscriber.unsubscribe_salt);
    const { subject, body } = guardianReminder.compose(
      { guardianName: guardian.name, childName, outcomes },
      { clubName, unsubscribeUrl, asAt: todayIn() },
    );

    const result = await sendMessage(client, clubId, recipient, {
      templateKey: guardianReminder.key,
      templateVersion: guardianReminder.version,
      purpose: guardianReminder.purpose,
      subject,
      body,
      unsubscribeUrl,
      aboutPersonId: childPersonId,
    });

    results.push({ to: email, outcome: result.outcome, detail: result.detail });
  }

  return results;
}

/**
 * When each of these people was last reminded, by the club, about
 * themselves.
 *
 * Read from `message_log` rather than from a column on the registration,
 * because the log is already the record of what was sent and a second one
 * would eventually disagree with it. `about_person_id` is the child (BR131
 * puts the guardian's name on the envelope and the child's in the body), so
 * this groups by the person the reminder was *about*, which is the person a
 * registrar is deciding whether to chase again.
 *
 * **Only `sent` counts.** A suppressed or failed attempt did not reach
 * anybody, so treating it as a reminder would leave a family uncontacted
 * for a week on the strength of a message that never arrived.
 */
export async function loadLastReminded(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  const last = new Map<string, string>();
  if (personIds.length === 0) return last;

  const { data } = await client
    .from('message_log')
    .select('about_person_id, created_at')
    .eq('club_id', clubId)
    .eq('template_key', guardianReminder.key)
    .eq('outcome', 'sent')
    .in('about_person_id', [...personIds])
    .order('created_at', { ascending: false });

  for (const row of data ?? []) {
    const personId = row.about_person_id as string | null;
    if (personId === null) continue;
    // Ordered newest first, so the first row seen for a person is the
    // latest — no comparison, and no risk of one written the wrong way.
    if (!last.has(personId)) last.set(personId, String(row.created_at).slice(0, 10));
  }

  return last;
}
