/**
 * The calendar feed, and the subscription behind it.
 *
 * The token is [decision 12](../../docs/decisions/12_an_unsubscribe_link_is_derived_not_stored.md)'s
 * construction, reused rather than reinvented: `HMAC(server secret, per-row
 * salt)`, with the hash stored so the database verifies without ever
 * holding the secret. The difference from the unsubscribe link is which
 * property matters — that one must be durable so a year-old email works,
 * this one must be rotatable so a lost phone stops reading it (BR31). The
 * same construction gives both.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { FeedEvent } from '../domain/calendar/ical.ts';
import { readMessagingConfig } from './env.ts';
import { deriveUnsubscribeToken, newSubscriberSecrets } from './messaging.ts';

export interface Subscription {
  readonly id: string;
  readonly personId: string;
  readonly holderPersonId: string;
  readonly feedSalt: string;
  readonly rotatedAt: string | null;
  readonly revokedAt: string | null;
}

/** Same derivation as the unsubscribe token; the salt is what differs. */
export function feedUrlFor(salt: string): string {
  const { siteUrl } = readMessagingConfig();
  return `${siteUrl}/calendar/${deriveUnsubscribeToken(salt)}.ics`;
}

/** What a calendar client subscribes to: `webcal:` swaps the scheme. */
export function webcalUrlFor(salt: string): string {
  return feedUrlFor(salt).replace(/^https?:/, 'webcal:');
}

export async function loadSubscription(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<Subscription | null> {
  const { data } = await client
    .from('calendar_subscription')
    .select('id, person_id, holder_person_id, feed_salt, rotated_at, revoked_at')
    .eq('club_id', clubId)
    .eq('person_id', personId)
    .maybeSingle();

  if (data === null) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    personId: r.person_id as string,
    holderPersonId: r.holder_person_id as string,
    feedSalt: r.feed_salt as string,
    rotatedAt: r.rotated_at as string | null,
    revokedAt: r.revoked_at as string | null,
  };
}

/**
 * Subscribe, or rotate an existing subscription.
 *
 * Rotation is a new salt and nothing else: BR31 wants the previous URL to
 * stop resolving immediately, and replacing the salt does exactly that
 * without a revocation list to maintain.
 */
export async function subscribeOrRotate(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  holderPersonId: string,
  existing: Subscription | null,
): Promise<{ salt: string } | { error: string }> {
  const { salt, tokenHash } = newSubscriberSecrets();

  const { error } = existing === null
    ? await client.from('calendar_subscription').insert({
        club_id: clubId,
        person_id: personId,
        holder_person_id: holderPersonId,
        feed_salt: salt,
        feed_token_hash: tokenHash,
      })
    : await client.from('calendar_subscription').update({
        feed_salt: salt,
        feed_token_hash: tokenHash,
        rotated_at: new Date().toISOString(),
        revoked_at: null,
      }).eq('id', existing.id);

  return error === null ? { salt } : { error: error.message.replace(/^.*?:\s*/, '') };
}

export async function revokeSubscription(
  client: SupabaseClient,
  subscriptionId: string,
): Promise<string | null> {
  const { error } = await client
    .from('calendar_subscription')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', subscriptionId);
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}

/**
 * The feed's events, for a token.
 *
 * BR141 — a projection, not a table read. The database function takes the
 * token and returns fixed columns; there is no filter here for a holder to
 * influence, because there is nothing here but a call.
 */
export async function loadFeed(
  client: SupabaseClient,
  token: string,
): Promise<readonly FeedEvent[] | null> {
  const { data, error } = await client.rpc('app_calendar_feed', { p_token: token });
  if (error !== null) return null;

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map((r) => ({
    appointmentId: r.appointment_id as string,
    playedOn: r.played_on as string,
    kickOff: r.kick_off as string | null,
    venue: r.venue as string | null,
    competition: r.competition as string | null,
    ownRole: r.own_role as string,
    state: r.state as string,
    fixtureStatus: r.fixture_status as string,
    updatedAt: r.updated_at as string,
  }));
}
