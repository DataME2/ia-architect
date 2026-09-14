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
  });

  if (error !== null) throw new QueryError('record_interest', error.message);
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
  }));
}
