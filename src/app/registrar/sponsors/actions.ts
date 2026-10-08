'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { attachBanner, createClubCampaign, recordAcquisitions, saveSponsorSettings, setCampaignStatus } from '../../../data/sponsors.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { bannerPath, checkBanner, parseCampaign } from '../../../web/sponsor-billing.ts';

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
