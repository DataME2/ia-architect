/**
 * Sponsor invoices and the club's referral partners (scope 85; BR171,
 * BR172). Every rule that matters — who bills, periods never billed twice,
 * the split, what counts as an acquisition — is the database's (0083).
 * Payments both ways are **simulated** until a provider is connected.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';

export type CollectionMethod = 'paypal' | 'google_pay' | 'bank_transfer';

export interface SponsorInvoice {
  readonly id: string;
  readonly campaignId: string;
  readonly number: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly amountCents: number;
  readonly clubShareCents: number;
  readonly platformShareCents: number;
  readonly status: 'issued' | 'paid';
  readonly paymentMethod: CollectionMethod | null;
  readonly paymentReference: string | null;
  readonly paidAt: string | null;
}

export async function loadInvoices(client: SupabaseClient, clubId: string): Promise<readonly SponsorInvoice[]> {
  const { data, error } = await client
    .from('sponsor_invoice')
    .select('id, campaign_id, invoice_number, period_from, period_to, amount_cents, club_share_cents, platform_share_cents, status, payment_method, payment_reference, paid_at')
    .eq('club_id', clubId)
    .order('issued_at', { ascending: false });
  if (error !== null) throw new QueryError('sponsor_invoice', error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    campaignId: r.campaign_id as string,
    number: r.invoice_number as string,
    periodFrom: r.period_from as string,
    periodTo: r.period_to as string,
    amountCents: Number(r.amount_cents),
    clubShareCents: Number(r.club_share_cents),
    platformShareCents: Number(r.platform_share_cents),
    status: r.status as SponsorInvoice['status'],
    paymentMethod: (r.payment_method as CollectionMethod | null) ?? null,
    paymentReference: (r.payment_reference as string | null) ?? null,
    paidAt: (r.paid_at as string | null) ?? null,
  }));
}

export async function issueInvoice(client: SupabaseClient, campaignId: string, from: string, to: string): Promise<string | null> {
  const { error } = await client.rpc('app_issue_sponsor_invoice', { p_campaign_id: campaignId, p_from: from, p_to: to });
  return error === null ? null : error.message;
}

/** Record the sponsor's payment — simulated (BR171). Returns the SIM reference or an error. */
export async function simulateSponsorPayment(
  client: SupabaseClient,
  invoiceId: string,
  method: CollectionMethod,
): Promise<{ readonly reference: string } | { readonly error: string }> {
  const { data, error } = await client.rpc('app_simulate_sponsor_payment', { p_invoice_id: invoiceId, p_method: method });
  return error === null ? { reference: String(data) } : { error: error.message };
}

// ------------------------------------------------------- referral partners

export interface ReferralPartner {
  readonly id: string;
  readonly name: string;
  readonly utmSource: string;
  readonly utmMedium: string;
  readonly utmCampaign: string;
  readonly cpaRateCents: number;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly status: 'active' | 'paused' | 'ended';
  /** Masked: where the partner is paid. */
  readonly payout: string;
  readonly attributed: number;
  readonly completed: number;
  readonly paidAcquisitions: number;
  readonly paidCents: number;
}

export async function loadPartners(client: SupabaseClient, clubId: string): Promise<readonly ReferralPartner[]> {
  const [partners, attributions, payouts] = await Promise.all([
    client.from('referral_partner')
      .select('id, name, utm_source, utm_medium, utm_campaign, cpa_rate_cents, starts_on, ends_on, status, payout_method, paypal_email, bsb, account_number')
      .eq('club_id', clubId).order('created_at', { ascending: false }),
    client.from('referral_attribution').select('partner_id, registration_id').eq('club_id', clubId),
    client.from('referral_payout').select('partner_id, acquisitions, amount_cents').eq('club_id', clubId),
  ]);
  if (partners.error !== null) throw new QueryError('referral_partner', partners.error.message);

  const regIds = ((attributions.data ?? []) as { registration_id: string }[]).map((a) => a.registration_id);
  const { data: regs } = regIds.length === 0
    ? { data: [] }
    : await client.from('registration').select('id, status').in('id', regIds);
  const complete = new Set(((regs ?? []) as { id: string; status: string }[]).filter((r) => r.status === 'COMPLETE').map((r) => r.id));

  return ((partners.data ?? []) as Record<string, string | number | null>[]).map((p) => {
    const mine = ((attributions.data ?? []) as { partner_id: string; registration_id: string }[]).filter((a) => a.partner_id === p.id);
    const paid = ((payouts.data ?? []) as { partner_id: string; acquisitions: number; amount_cents: number }[]).filter((x) => x.partner_id === p.id);
    const payout = p.payout_method === 'paypal'
      ? `PayPal · ${String(p.paypal_email).slice(0, 1)}***@${String(p.paypal_email).split('@')[1] ?? ''}`
      : `Bank · BSB ***-${String(p.bsb).slice(-3)} · ****${String(p.account_number).slice(-4)}`;
    return {
      id: p.id as string,
      name: p.name as string,
      utmSource: p.utm_source as string,
      utmMedium: p.utm_medium as string,
      utmCampaign: p.utm_campaign as string,
      cpaRateCents: Number(p.cpa_rate_cents),
      startsOn: p.starts_on as string,
      endsOn: p.ends_on as string,
      status: p.status as ReferralPartner['status'],
      payout,
      attributed: mine.length,
      completed: mine.filter((a) => complete.has(a.registration_id)).length,
      paidAcquisitions: paid.reduce((s, x) => s + x.acquisitions, 0),
      paidCents: paid.reduce((s, x) => s + x.amount_cents, 0),
    };
  });
}

export interface NewPartner {
  readonly name: string;
  readonly utmSource: string;
  readonly utmCampaign: string;
  readonly cpaRateCents: number;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly payout:
    | { readonly method: 'paypal'; readonly paypalEmail: string }
    | { readonly method: 'bank_transfer'; readonly accountName: string; readonly bsb: string; readonly accountNumber: string };
}

export async function createPartner(client: SupabaseClient, clubId: string, input: NewPartner, userId: string): Promise<string | null> {
  const { error } = await client.from('referral_partner').insert({
    club_id: clubId,
    name: input.name,
    utm_source: input.utmSource,
    utm_campaign: input.utmCampaign,
    cpa_rate_cents: input.cpaRateCents,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    payout_method: input.payout.method,
    paypal_email: input.payout.method === 'paypal' ? input.payout.paypalEmail : null,
    account_name: input.payout.method === 'bank_transfer' ? input.payout.accountName : null,
    bsb: input.payout.method === 'bank_transfer' ? input.payout.bsb : null,
    account_number: input.payout.method === 'bank_transfer' ? input.payout.accountNumber : null,
    created_by: userId,
  });
  if (error === null) return null;
  if (error.code === '23505') return 'That source and campaign pair is already a partner of this club.';
  return error.code === '42501' ? 'Only the club’s admin or treasurer manages partners (BR172).' : error.message;
}

export async function simulatePartnerPayout(client: SupabaseClient, partnerId: string, from: string, to: string): Promise<{ readonly paid: number } | { readonly error: string }> {
  const { data, error } = await client.rpc('app_simulate_partner_payout', { p_partner_id: partnerId, p_from: from, p_to: to });
  return error === null ? { paid: Number(data) } : { error: error.message };
}

/** Attribute a just-saved public registration to the partner whose link it came through. Never fails the registration. */
export async function attributeRegistration(
  client: SupabaseClient,
  registrationId: string,
  utm: { readonly source: string; readonly campaign: string },
): Promise<void> {
  await client.rpc('app_attribute_registration', {
    p_registration_id: registrationId,
    p_utm_source: utm.source,
    p_utm_campaign: utm.campaign,
  });
}
