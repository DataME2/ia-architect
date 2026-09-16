/**
 * BR51's six-monthly nudge, sent (scope 48, WP2).
 *
 * Orchestration only, in the shape `reminders.ts` established for the
 * registration reminder: what the message says is
 * `../domain/messaging/templates.ts`, whether it may be sent is the
 * suppression rule, and how it leaves the building is `messaging.ts`. This
 * module joins them to a club's overdue clearances and the Secretary who
 * gets told about them.
 *
 * There is no `secretary` system-access role — the office is recorded on
 * `committee_position`, not on `club_membership` — so *who* the reminder
 * goes to is resolved here: the current holder of the `secretary` position
 * on the most recently started committee term who has not resigned.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { wwccReminder, type WwccDue } from '../domain/messaging/templates.ts';
import { todayIn } from '../web/today.ts';
import {
  messagingUnavailableReason,
  sendMessage,
  subscriberFor,
  toRecipient,
  unsubscribeUrlFor,
  type SubscriberRow,
} from './messaging.ts';

export interface WwccReminderResult {
  readonly clubId: string;
  readonly due: number;
  readonly outcome: 'sent' | 'suppressed' | 'failed' | 'none-due';
  readonly detail: string | null;
}

interface DueRow {
  readonly clearance_id: string;
  readonly person_name: string;
  readonly kind: string;
  readonly expires_on: string;
}

/**
 * Everything due for one club: finds the Secretary, composes one email
 * covering every overdue clearance, sends it, and marks `reminder_sent_at`
 * only for the clearances actually included in a message that sent —
 * a failed or suppressed send leaves them due, so the next run tries
 * again rather than waiting another six months.
 */
export async function sendWwccReminders(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
): Promise<WwccReminderResult> {
  const { data, error } = await client.rpc('app_wwcc_due_for_reminder', { p_club_id: clubId });
  if (error !== null) {
    return { clubId, due: 0, outcome: 'failed', detail: error.message };
  }

  const due = (Array.isArray(data) ? data : []) as DueRow[];
  if (due.length === 0) return { clubId, due: 0, outcome: 'none-due', detail: null };

  const secretary = await currentSecretary(client, clubId);
  if (secretary === null) {
    return {
      clubId, due: due.length, outcome: 'failed',
      detail: 'No current Secretary is recorded for this club (committee_position).',
    };
  }
  if (secretary.email === null || secretary.email.trim() === '') {
    return {
      clubId, due: due.length, outcome: 'failed',
      detail: `No email address is recorded for the Secretary (${secretary.name}).`,
    };
  }

  let subscriber: SubscriberRow;
  let unsubscribeUrl: string;
  try {
    const found = await subscriberFor(client, clubId, secretary.personId, secretary.email);
    if (found === null) {
      return { clubId, due: due.length, outcome: 'failed', detail: 'Could not record the Secretary as contactable.' };
    }
    subscriber = found;
    unsubscribeUrl = unsubscribeUrlFor(subscriber.id, subscriber.unsubscribe_salt);
  } catch (error) {
    const reason = messagingUnavailableReason(error);
    if (reason === null) throw error;
    return { clubId, due: due.length, outcome: 'failed', detail: reason };
  }

  const recipient = toRecipient(subscriber, secretary.name);
  const wwccDue: readonly WwccDue[] = due.map((d) => ({
    personName: d.person_name,
    kind: d.kind,
    expiresOn: d.expires_on,
  }));
  const { subject, body } = wwccReminder.compose(
    { secretaryName: secretary.name, due: wwccDue },
    { clubName, unsubscribeUrl, asAt: todayIn() },
  );

  const result = await sendMessage(client, clubId, recipient, {
    templateKey: wwccReminder.key,
    templateVersion: wwccReminder.version,
    purpose: wwccReminder.purpose,
    subject,
    body,
    unsubscribeUrl,
    aboutPersonId: null,
  });

  if (result.outcome === 'sent') {
    for (const row of due) {
      await client.rpc('app_record_wwcc_reminder_sent', { p_clearance_id: row.clearance_id });
    }
  }

  return { clubId, due: due.length, outcome: result.outcome, detail: result.detail };
}

interface SecretaryContact {
  readonly personId: string;
  readonly name: string;
  readonly email: string | null;
}

/**
 * The current Secretary, or null if the club has none recorded. "Current"
 * is the most recently *started* term, matching `platform_clubs()`'s own
 * reasoning for `club_licence` (0018): whether a term has since lapsed is a
 * date comparison the caller can make, not a `where` clause that would
 * quietly hide a club whose committee has gone stale.
 */
async function currentSecretary(client: SupabaseClient, clubId: string): Promise<SecretaryContact | null> {
  const { data: terms, error: termsError } = await client
    .from('committee_term')
    .select('id')
    .eq('club_id', clubId)
    .order('starts_on', { ascending: false })
    .limit(1);
  if (termsError !== null || terms === null || terms.length === 0) return null;

  const { data: positions, error: posError } = await client
    .from('committee_position')
    .select('person_id')
    .eq('club_id', clubId)
    .eq('term_id', terms[0]!.id as string)
    .eq('position', 'secretary')
    .is('resigned_on', null)
    .limit(1);
  if (posError !== null || positions === null || positions.length === 0) return null;

  const { data: person, error: personError } = await client
    .from('person')
    .select('legal_given_names, legal_family_name, email')
    .eq('id', positions[0]!.person_id as string)
    .maybeSingle();
  if (personError !== null || person === null) return null;

  return {
    personId: positions[0]!.person_id as string,
    name: `${person.legal_given_names} ${person.legal_family_name}`,
    email: person.email as string | null,
  };
}
