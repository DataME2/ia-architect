/**
 * Sending, and deciding not to send.
 *
 * The pure half — what a message says, who it goes to, whether it may be
 * sent — is `src/domain/messaging/`. This module is the impure half: the
 * token derivation that needs a server secret, the provider that needs a
 * network, and the log write that needs a database.
 *
 * **The order in `sendMessage` is the whole design.** Suppression is
 * checked here, against our own rows, before the provider is reached
 * (BR128, BR129) — and every outcome is written to `message_log`, including
 * the ones deliberately not sent (BR127).
 */
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { sendVerdict } from '../domain/messaging/suppression.ts';
import type {
  ComposedMessage,
  MessageOutcome,
  MessagePurpose,
  Recipient,
} from '../domain/messaging/types.ts';
import { ConfigError, readMessagingConfig, readTransportConfig } from './env.ts';

// ---------------------------------------------------------------- the token

/**
 * The durable unsubscribe token for a salt (decision 12).
 *
 * Deterministic on purpose: the same salt yields the same token forever, so
 * a link in a year-old message still works. That is the requirement BR73's
 * hash-only pattern could not meet, and the reason this one departs from it.
 */
export function deriveUnsubscribeToken(salt: string): string {
  const { unsubscribeSecret } = readMessagingConfig();
  return createHmac('sha256', unsubscribeSecret).update(salt).digest('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * What a new subscriber row needs.
 *
 * The salt is stored and is not a secret; the hash is stored so the
 * *database* can verify a presented token without ever holding the secret
 * that derives it.
 */
export function newSubscriberSecrets(): { salt: string; token: string; tokenHash: string } {
  const salt = randomBytes(32).toString('base64url');
  const token = deriveUnsubscribeToken(salt);
  return { salt, token, tokenHash: hashToken(token) };
}

export function unsubscribeUrlFor(id: string, salt: string): string {
  const { siteUrl } = readMessagingConfig();
  return `${siteUrl}/unsubscribe/${id}.${deriveUnsubscribeToken(salt)}`;
}

/**
 * Turns a missing or malformed `NEXT_PUBLIC_SITE_URL` /
 * `MESSAGING_UNSUBSCRIBE_SECRET` into a reason a registrar can act on,
 * rather than the unhandled `ConfigError` `unsubscribeUrlFor` and
 * `subscriberFor`'s first-contact path throw. Every caller of this module
 * needs an unsubscribe link to compose a message at all, so every caller
 * hits the same deployment fault the same way — and it is a fault, not a
 * fact about the recipient: chasing one family is no more or less possible
 * than chasing another when the site's own URL is not configured.
 *
 * Returns `null` for anything that is not this specific, known
 * misconfiguration, so a caller can re-throw rather than silently
 * swallowing a real bug behind a generic message.
 */
export function messagingUnavailableReason(error: unknown): string | null {
  return error instanceof ConfigError
    ? `Messages cannot be sent right now: ${error.message}. This is a deployment configuration ` +
      'problem, not something a resend will fix — nobody was contacted.'
    : null;
}

/** Constant-time, because the caller is anonymous and may be guessing. */
export function tokenMatches(token: string, expectedHash: string): boolean {
  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(expectedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------------------------------------------- the transport

export interface MessageTransport {
  readonly name: string;
  send: (to: string, subject: string, body: string) => Promise<void>;
}

/**
 * Resend, behind the interface rather than in front of it.
 *
 * BR129 says suppression is ours and not the provider's; this interface is
 * that rule expressed in the stack. Changing provider is a new
 * implementation of three lines, and takes no withdrawal with it.
 */
export function resendTransport(): MessageTransport | null {
  const config = readTransportConfig();
  if (config === null) return null;

  return {
    name: 'resend',
    send: async (to, subject, body) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: config.fromAddress, to, subject, text: body }),
      });
      if (!response.ok) {
        throw new Error(`Provider refused the message (${response.status}).`);
      }
    },
  };
}

// ------------------------------------------------------------------ sending

export interface SendResult {
  readonly outcome: MessageOutcome;
  /** Why, for anything but a plain send. Written to the log and shown. */
  readonly detail: string | null;
}

/**
 * Send one message, or record why not.
 *
 * Every path through this function writes a `message_log` row. An absent
 * row would mean both "never attempted" and "correctly withheld", and
 * telling those apart is the only reason the log exists (BR127).
 */
export async function sendMessage(
  client: SupabaseClient,
  clubId: string,
  recipient: Recipient,
  message: ComposedMessage,
  transport: MessageTransport | null = resendTransport(),
): Promise<SendResult> {
  const log = async (outcome: MessageOutcome, detail: string | null): Promise<SendResult> => {
    await client.from('message_log').insert({
      club_id: clubId,
      subscriber_id: recipient.subscriberId,
      to_email: recipient.email,
      purpose: message.purpose,
      template_key: message.templateKey,
      template_version: message.templateVersion,
      subject: message.subject,
      outcome,
      outcome_detail: detail,
      about_person_id: message.aboutPersonId,
    });
    return { outcome, detail };
  };

  // 1. Ours, first. A withdrawal the provider is asked about after the
  //    message has left is not a withdrawal.
  const verdict = sendVerdict(recipient, message.purpose);
  if (!verdict.send) return log('suppressed', verdict.reason);

  // 2. No provider is a failure, loudly — never a silent success.
  if (transport === null) {
    return log('failed', 'No email provider is configured, so nothing was sent.');
  }

  try {
    await transport.send(recipient.email, message.subject, message.body);
    return log('sent', null);
  } catch (error) {
    return log('failed', error instanceof Error ? error.message : 'The provider rejected the message.');
  }
}

// --------------------------------------------------------------- subscribers

export interface SubscriberRow {
  readonly id: string;
  readonly person_id: string;
  readonly email: string;
  readonly unsubscribe_salt: string;
  readonly operational_suppressed_at: string | null;
  readonly marketing_suppressed_at: string | null;
}

export function toRecipient(row: SubscriberRow, displayName: string): Recipient {
  return {
    subscriberId: row.id,
    personId: row.person_id,
    email: row.email,
    displayName,
    suppression: {
      operationalSuppressedAt: row.operational_suppressed_at,
      marketingSuppressedAt: row.marketing_suppressed_at,
    },
  };
}

/**
 * The subscriber row for a Person, created on first contact.
 *
 * Created rather than required up front: a Person becomes contactable the
 * first time somebody tries to contact them, and a registration flow that
 * had to remember to create one would eventually forget.
 */
export async function subscriberFor(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  email: string,
): Promise<SubscriberRow | null> {
  const existing = await client
    .from('message_subscriber')
    .select('id, person_id, email, unsubscribe_salt, operational_suppressed_at, marketing_suppressed_at')
    .eq('club_id', clubId)
    .eq('person_id', personId)
    .maybeSingle();

  if (existing.data !== null) {
    // The log must say where a message actually went, so keep the address
    // current — without touching suppression, which only one door changes.
    if (existing.data.email !== email) {
      await client.from('message_subscriber').update({ email }).eq('id', existing.data.id);
      return { ...(existing.data as SubscriberRow), email };
    }
    return existing.data as SubscriberRow;
  }

  const { salt, tokenHash } = newSubscriberSecrets();
  const created = await client
    .from('message_subscriber')
    .insert({
      club_id: clubId,
      person_id: personId,
      email,
      unsubscribe_salt: salt,
      unsubscribe_token_hash: tokenHash,
    })
    .select('id, person_id, email, unsubscribe_salt, operational_suppressed_at, marketing_suppressed_at')
    .single();

  return (created.data as SubscriberRow | null) ?? null;
}

export async function unsubscribe(
  client: SupabaseClient,
  id: string,
  token: string,
  purpose: MessagePurpose | 'all',
): Promise<{ ok: boolean; message: string }> {
  const { error } = await client.rpc('app_unsubscribe', {
    p_id: id,
    p_token: token,
    p_purpose: purpose,
  });

  if (error !== null) {
    return { ok: false, message: 'This unsubscribe link is not valid. It may have been replaced by a newer one.' };
  }
  return {
    ok: true,
    message: purpose === 'marketing'
      ? 'Done — you will not receive club news from us again.'
      : 'Done — we will not email you again. Your club will need to contact you another way.',
  };
}
