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
