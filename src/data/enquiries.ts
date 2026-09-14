/**
 * A club's expression of interest, and the lead list behind it.
 *
 * Thin on purpose, in both directions. `record_interest` decides what an
 * enquiry is allowed to be (BR144's two required fields) and `app_enquiries`
 * decides who may read the list — both in the database, because `prospect`
 * denies every API request in both directions and a definer function is the
 * only door there is. Putting either rule here would put it somewhere a
 * second caller could route around.
 */
import { QueryError } from './queries.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClubEnquiry } from '../web/enquiry-form.ts';
import { ENQUIRY_CONSENT_WORDING } from '../web/enquiry-form.ts';
import { composeEnquiryAlert, type EnquiryAlertInput } from '../domain/messaging/platform-alert.ts';
import { readPlatformAlertAddress } from './env.ts';
import { resendTransport, type MessageTransport } from './messaging.ts';

/**
 * Records an enquiry. **Grants nothing** (BR145).
 *
 * No club, no account, no membership, no access — a tenant is created only
 * on the platform owner's authorisation
 * ([decision 7](../../docs/decisions/7_tenant-provisioning-by-owner-issued-invitation.md)).
 */
export async function recordInterest(
  client: SupabaseClient,
  enquiry: ClubEnquiry,
  notification: AlertResult = { notified: false, error: null },
): Promise<void> {
  const { error } = await client.rpc('record_interest', {
    p_club_name: enquiry.clubName,
    p_email: enquiry.email,
    p_contact_name: enquiry.contactName,
    p_contact_role: enquiry.contactRole,
    p_jurisdiction: enquiry.jurisdiction,
    p_club_size: enquiry.clubSize,
    p_current_system: enquiry.currentSystem,
    p_note: enquiry.note,
    p_phone: enquiry.phone,
    // The wording is sent from this server-side constant rather than from
    // the form, so what is stored is what was rendered rather than what a
    // caller claims was rendered (BR93). Null where consent was withheld:
    // the moment and the words travel together or not at all.
    p_marketing_wording: enquiry.marketingConsent ? ENQUIRY_CONSENT_WORDING : null,
    p_notified: notification.notified,
    p_notify_error: notification.error,
  });

  if (error !== null) throw new QueryError('record_interest', error.message);
}

export interface AlertResult {
  readonly notified: boolean;
  /** Why nobody was told, where nobody was. Null on success. */
  readonly error: string | null;
}

/**
 * How long the provider gets before the club's enquiry stops waiting on it.
 *
 * The enquirer is watching a spinner while this runs. A provider that hangs
 * must not turn a successful enquiry into a failed-looking one, so the
 * alert gives up and the enquiry proceeds — recording that nobody was told,
 * which is the outcome the console shows.
 */
export const ALERT_TIMEOUT_MS = 5_000;

/**
 * Emails the platform's operators that a club has enquired.
 *
 * **Not through `sendMessage`, and that is BR146 rather than a shortcut.**
 * That path checks suppression against a `message_subscriber` row, attaches
 * an unsubscribe link, and writes to `message_log` — a table whose
 * `club_id` is `not null`. None of the three applies here: the recipient is
 * the platform's own operator, not a data subject; there is no club; and an
 * unsubscribe link on an operational alert would let an operator switch off
 * the only signal that a customer is trying to reach them.
 *
 * What *is* reused is the transport, which is the part worth sharing:
 * changing provider still changes one implementation (BR129).
 *
 * **Never throws.** Every failure becomes an `AlertResult` the caller
 * records, because the enquiry itself is the thing that must survive: a
 * club that typed its details and got an error because an email provider
 * was down has been failed twice.
 */
export async function alertPlatform(
  enquiry: EnquiryAlertInput,
  transport: MessageTransport | null = resendTransport(),
  to: string | null = readPlatformAlertAddress(),
  // Injectable so the test that proves the timeout works does not have to
  // wait five seconds to prove it. Nothing in the application passes it.
  timeoutMs: number = ALERT_TIMEOUT_MS,
): Promise<AlertResult> {
  if (to === null) {
    return { notified: false, error: 'No alert address is configured (PLATFORM_ALERT_TO).' };
  }
  if (transport === null) {
    return { notified: false, error: 'No email provider is configured, so nothing was sent.' };
  }

  // `ClubEnquiry` satisfies this structurally, so the enquiry path passes
  // its parsed form straight through and the retry path maps a stored row
  // into the same shape — **one composer, two callers**, which is what
  // stops a retried alert quietly diverging from the original.
  const alert = composeEnquiryAlert(enquiry);

  // The timer is cleared either way. Leaving it pending would hold the
  // process for five seconds after every successful send, and `unref()` is
  // not the fix — an unreferenced timer never fires when the only other
  // pending work is a provider that has stopped answering, which is
  // precisely the case this exists for.
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      transport.send(to, alert.subject, alert.body),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`The provider did not answer within ${timeoutMs}ms.`)),
          timeoutMs,
        );
      }),
    ]);
    return { notified: true, error: null };
  } catch (error) {
    return {
      notified: false,
      error: error instanceof Error ? error.message : 'The provider rejected the alert.',
    };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export interface Enquiry {
  readonly email: string;
  readonly phone: string | null;
  readonly clubName: string | null;
  readonly jurisdiction: string | null;
  readonly contactName: string | null;
  readonly contactRole: string | null;
  readonly clubSize: string | null;
  readonly currentSystem: string | null;
  readonly note: string | null;
  /** `enquiry` or `demo` — which door this lead came through. */
  readonly source: string;
  /** Null for somebody who has only looked at the demonstration club. */
  readonly enquiredAt: string | null;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  /**
   * When marketing consent was granted, or null.
   *
   * Null covers both *never granted* and *since withdrawn*, which is
   * deliberate at this distance: both mean do not send, and the screen's
   * job is to answer that question rather than to narrate the history.
   */
  readonly marketingConsentAt: string | null;
  /** When the platform's operators were told. Null means nobody was. */
  readonly notifiedAt: string | null;
  /** Why nobody was told, where that is known. */
  readonly notifyError: string | null;
  /** How many times delivery has been attempted, successful or not. */
  readonly notifyAttempts: number;
  /** When it was last attempted. `notifiedAt` is the success; this is the try. */
  readonly notifyAttemptedAt: string | null;
}

/** The lead list, for the platform owner. Raises for anybody else. */
export async function loadEnquiries(client: SupabaseClient): Promise<readonly Enquiry[]> {
  const { data, error } = await client.rpc('app_enquiries');
  if (error !== null) throw new QueryError('app_enquiries', error.message);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((row) => ({
    email: String(row['email']),
    phone: (row['phone'] as string | null) ?? null,
    clubName: (row['club_name'] as string | null) ?? null,
    jurisdiction: (row['jurisdiction'] as string | null) ?? null,
    contactName: (row['contact_name'] as string | null) ?? null,
    contactRole: (row['contact_role'] as string | null) ?? null,
    clubSize: (row['club_size'] as string | null) ?? null,
    currentSystem: (row['current_system'] as string | null) ?? null,
    note: (row['note'] as string | null) ?? null,
    source: String(row['source']),
    enquiredAt: (row['enquired_at'] as string | null) ?? null,
    firstSeenAt: String(row['first_seen_at']),
    lastSeenAt: String(row['last_seen_at']),
    marketingConsentAt: (row['marketing_consent_at'] as string | null) ?? null,
    notifiedAt: (row['notified_at'] as string | null) ?? null,
    notifyError: (row['notify_error'] as string | null) ?? null,
    notifyAttempts: Number(row['notify_attempts'] ?? 0),
    notifyAttemptedAt: (row['notify_attempted_at'] as string | null) ?? null,
  }));
}

// ----------------------------------------------------------------- retrying

/**
 * A stored enquiry, as the alert composer wants it.
 *
 * **The same function composes both sends**, and that is the point of this
 * three-line mapping rather than a second template. The first alert is
 * built from the form the visitor submitted and a retry is built from the
 * row it became, so two composers would drift — and the divergence would
 * only ever be visible in the retried copy, which is the one nobody is
 * watching.
 */
export function alertInputFor(enquiry: Enquiry): EnquiryAlertInput {
  return {
    // A prospect who only ever looked at the demonstration club has no club
    // name, and is not a candidate below — but the type needs one, and the
    // address is the honest fallback rather than an invented name.
    clubName: enquiry.clubName ?? enquiry.email,
    email: enquiry.email,
    contactName: enquiry.contactName,
    contactRole: enquiry.contactRole,
    jurisdiction: enquiry.jurisdiction,
    clubSize: enquiry.clubSize,
    currentSystem: enquiry.currentSystem,
    note: enquiry.note,
    phone: enquiry.phone,
    marketingConsent: enquiry.marketingConsentAt !== null,
  };
}

/**
 * The enquiries whose alert failed and has not since been delivered.
 *
 * **Delivery is terminal** (BR147): a row that was delivered is not a
 * candidate, however many times it failed before. The obvious
 * implementation of a retry — send everything not confirmed — emails an
 * operator three times about one club, and an operator who is emailed three
 * times about one club stops reading the alerts, which is the state the
 * alert was built to fix.
 */
export function alertsPending(enquiries: readonly Enquiry[]): readonly Enquiry[] {
  return enquiries.filter((e) => e.notifiedAt === null && e.notifyError !== null);
}

export interface RetrySummary {
  readonly attempted: number;
  readonly delivered: number;
  /** One line per enquiry that failed again, so the screen can say which. */
  readonly stillFailing: readonly { readonly clubName: string; readonly error: string }[];
}

/**
 * Retries every alert that failed, as an explicit act by the platform owner.
 *
 * **A person, not a schedule** (BR147). Nothing in this product runs on a
 * schedule — the same missing piece that leaves the retention review a
 * button — and the tempting alternative, an opportunistic retry riding on
 * the next enquiry, fails in exactly the wrong place: a quiet week is when
 * a missed lead matters most, and a quiet week is when it would never fire.
 *
 * Written so that the day a scheduler exists it calls this, unchanged.
 *
 * Each send is recorded as it happens rather than at the end, so a run that
 * dies half way has still banked the alerts it delivered — the alternative
 * loses the record of messages that genuinely went out, and the next run
 * sends them again.
 */
export async function retryFailedAlerts(
  client: SupabaseClient,
  transport: MessageTransport | null = resendTransport(),
  to: string | null = readPlatformAlertAddress(),
): Promise<RetrySummary> {
  const pending = alertsPending(await loadEnquiries(client));

  let delivered = 0;
  const stillFailing: { clubName: string; error: string }[] = [];

  for (const enquiry of pending) {
    const result = await alertPlatform(alertInputFor(enquiry), transport, to);

    const { error } = await client.rpc('app_record_alert_outcome', {
      p_email: enquiry.email,
      p_notified: result.notified,
      p_error: result.error,
    });
    if (error !== null) throw new QueryError('app_record_alert_outcome', error.message);

    if (result.notified) delivered += 1;
    else {
      stillFailing.push({
        clubName: enquiry.clubName ?? enquiry.email,
        error: result.error ?? 'The provider rejected the alert.',
      });
    }
  }

  return { attempted: pending.length, delivered, stillFailing };
}
