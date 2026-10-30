'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { addFeeLine, retireFeeLine, saveSiblingDiscount, saveTerms } from '../../../data/registration-fees.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { parseDiscount, parseFeeLine, termsValues } from '../../../web/registration-fee-form.ts';

/**
 * The fee schedule's actions (scope 130, WP3). Every refusal that matters is
 * the database's: 0099's checks on an amount, a deposit and an age range,
 * and its policies that let only the admin and the treasurer write (BR196).
 * These parse, translate a refusal into a sentence, and stop.
 */
async function club() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return null;
  const tenant = await loadTenantContext(client, user.id);
  return tenant === null ? null : { client, clubId: tenant.clubId };
}

const PATH = '/registrar/registration-fees';

export async function addFeeLineAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = parseFeeLine({
    kind: String(formData.get('kind') ?? ''),
    name: String(formData.get('name') ?? ''),
    amount: String(formData.get('amount') ?? ''),
    deposit: String(formData.get('deposit') ?? ''),
    minAge: String(formData.get('minAge') ?? ''),
    maxAge: String(formData.get('maxAge') ?? ''),
    adminOnly: formData.get('adminOnly') === 'on',
  });
  if (!parsed.ok) return formFailed(parsed.error);
  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') return formFailed('Choose a season first.');

  const c = await club();
  if (c === null) return formFailed('Sign in first.');
  const done = await addFeeLine(c.client, c.clubId, seasonId, parsed.value);
  if ('error' in done) return formFailed(done.error);
  revalidatePath(PATH);
  return formOk(`${parsed.value.name} added.`);
}

export async function retireFeeLineAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const c = await club();
  if (c === null) return formFailed('Sign in first.');
  const done = await retireFeeLine(c.client, c.clubId, String(formData.get('id') ?? ''));
  if ('error' in done) return formFailed(done.error);
  revalidatePath(PATH);
  return formOk('Retired. A registration already priced from it keeps its price.');
}

export async function saveDiscountAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = parseDiscount(String(formData.get('percent') ?? ''));
  if (!parsed.ok) return formFailed(parsed.error);
  const c = await club();
  if (c === null) return formFailed('Sign in first.');
  const done = await saveSiblingDiscount(c.client, c.clubId, parsed.value);
  if ('error' in done) return formFailed(done.error);
  revalidatePath(PATH);
  return formOk(`Each sibling after the first now gets ${parsed.value / 100}% off their club fee.`);
}

export async function saveTermsAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const body = String(formData.get('body') ?? '').trim();
  if (body.length > 20000) return formFailed('Keep the terms under 20,000 characters.');
  const c = await club();
  if (c === null) return formFailed('Sign in first.');
  const done = await saveTerms(c.client, c.clubId, body, termsValues([...formData.entries()].map(([k, v]) => [k, String(v)] as const)));
  if ('error' in done) return formFailed(done.error);
  revalidatePath(PATH);
  return formOk('Terms saved. Families will read them as previewed.');
}
