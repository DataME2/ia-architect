'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { attachBanner, createClubCampaign, recordAcquisitions, saveSponsorSettings, setCampaignStatus } from '../../../data/sponsors.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { bannerPath, checkBanner, parseCampaign } from '../../../web/sponsor-billing.ts';
import { createPartner, issueInvoice, simulatePartnerPayout, simulateSponsorPayment } from '../../../data/sponsor-money.ts';
import { parsePartner } from '../../../web/utm.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('No club.');
  return { client, user, tenant };
}

/** A club's own sponsor campaign (BR170). The database decides who may. */
export async function createCampaignAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = parseCampaign({
    sponsorName: String(formData.get('sponsorName') ?? ''),
    headline: String(formData.get('headline') ?? ''),
    body: String(formData.get('body') ?? ''),
    linkUrl: String(formData.get('linkUrl') ?? ''),
    pricingModel: String(formData.get('pricingModel') ?? ''),
    rate: String(formData.get('rate') ?? ''),
    audience: formData.getAll('audience').map(String),
    startsOn: String(formData.get('startsOn') ?? ''),
    endsOn: String(formData.get('endsOn') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  // An optional banner, checked before anything is written (decision 17: we host it).
  const banner = formData.get('banner');
  const file = banner instanceof File && banner.size > 0 ? banner : null;
  const checked = file === null ? null : checkBanner(file);
  if (checked !== null && !checked.ok) return formFailed(checked.error);

  const { client, user, tenant } = await requireTenant();
  const created = await createClubCampaign(client, tenant.clubId, parsed.value, user.id);
  if ('error' in created) return formFailed(created.error);
  revalidatePath('/registrar/sponsors');
  if (file !== null && checked !== null && checked.ok) {
    const path = bannerPath(tenant.clubId, created.id, Date.now(), checked.extension);
    const error = await attachBanner(client, tenant.clubId, created.id, path, file);
    if (error !== null) return formFailed(`Campaign created, but the banner did not upload: ${error}`);
  }
  return formOk('Campaign live from its start date.');
}

export async function setCampaignStatusAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (id === '' || (status !== 'active' && status !== 'paused' && status !== 'ended')) return formFailed('Which campaign?');
  const { client, tenant } = await requireTenant();
  const error = await setCampaignStatus(client, tenant.clubId, id, status);
  revalidatePath('/registrar/sponsors');
  return error === null ? formOk(`Campaign ${status}.`) : formFailed(error);
}

/** CPA: acquisitions the sponsor reports (a promo code redeemed, a sign-up). */
export async function recordAcquisitionsAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const id = String(formData.get('id') ?? '');
  const onDay = String(formData.get('onDay') ?? '');
  const count = Number(formData.get('count') ?? 0);
  if (id === '' || !/^\d{4}-\d{2}-\d{2}$/.test(onDay) || !Number.isInteger(count) || count < 1) {
    return formFailed('Enter the day and how many acquisitions the sponsor reported.');
  }
  const { client } = await requireTenant();
  const error = await recordAcquisitions(client, id, onDay, count);
  revalidatePath('/registrar/sponsors');
  return error === null ? formOk(`${count} recorded.`) : formFailed(error);
}

export async function saveSponsorSettingsAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const { client, user, tenant } = await requireTenant();
  const error = await saveSponsorSettings(client, tenant.clubId, formData.get('accepts') === 'on', user.id);
  revalidatePath('/registrar/sponsors');
  return error === null ? formOk('Saved.') : formFailed(error);
}

// ------------------------------------------------------- invoices (BR171)

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function issueInvoiceAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const campaignId = String(formData.get('campaignId') ?? '');
  const from = String(formData.get('from') ?? '');
  const to = String(formData.get('to') ?? '');
  if (campaignId === '' || !DAY.test(from) || !DAY.test(to)) return formFailed('Choose the period to invoice.');
  const { client } = await requireTenant();
  const error = await issueInvoice(client, campaignId, from, to);
  revalidatePath('/registrar/sponsors');
  return error === null ? formOk('Invoice issued for that period.') : formFailed(error);
}

/** The sponsor's payment, simulated: no provider is connected and no money moves (BR171). */
export async function recordSponsorPaymentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const method = String(formData.get('method') ?? '');
  if (invoiceId === '' || (method !== 'paypal' && method !== 'google_pay' && method !== 'bank_transfer')) {
    return formFailed('Choose how the sponsor paid.');
  }
  const { client } = await requireTenant();
  const result = await simulateSponsorPayment(client, invoiceId, method);
  revalidatePath('/registrar/sponsors');
  return 'error' in result
    ? formFailed(result.error)
    : formOk(`Simulated payment recorded (${result.reference}). No money moved.`);
}

// ------------------------------------------------ referral partners (BR172)

export async function createPartnerAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = parsePartner(Object.fromEntries(formData));
  if (!parsed.ok) return formFailed(parsed.error);
  const { client, user, tenant } = await requireTenant();
  const error = await createPartner(client, tenant.clubId, parsed.value, user.id);
  revalidatePath('/registrar/sponsors');
  return error === null ? formOk('Partner added. Copy their link below.') : formFailed(error);
}

/** Pay a partner for the completed registrations it brought — simulated (BR172). */
export async function payPartnerAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const partnerId = String(formData.get('partnerId') ?? '');
  const from = String(formData.get('from') ?? '');
  const to = String(formData.get('to') ?? '');
  if (partnerId === '' || !DAY.test(from) || !DAY.test(to)) return formFailed('Choose the period to pay.');
  const { client } = await requireTenant();
  const result = await simulatePartnerPayout(client, partnerId, from, to);
  revalidatePath('/registrar/sponsors');
  return 'error' in result
    ? formFailed(result.error)
    : formOk(`Simulated payout recorded for ${result.paid} completed registration${result.paid === 1 ? '' : 's'}. No money moved.`);
}
