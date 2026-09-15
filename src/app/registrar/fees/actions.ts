'use server';

import { revalidatePath } from 'next/cache';

import { addRate, copyRatesInto, createSchedule, loadRates, removeRate } from '../../../data/fees.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { duplicateOf, parseRate, parseSchedule } from '../../../web/fee-schedule-form.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * Publishing a schedule, and filling in its cells.
 *
 * Every refusal that matters is the database's: 0026's `unique (club_id,
 * effective_from)`, its `unique nulls not distinct` on a cell, and the
 * policies that let only an admin or treasurer write. These actions parse,
 * translate those refusals into a sentence, and stop.
 */
export async function createScheduleAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseSchedule({
    effectiveFrom: String(formData.get('effectiveFrom') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const copyFrom = String(formData.get('copyFrom') ?? '').trim();

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const created = await createSchedule(
    client, tenant.clubId, parsed.effectiveFrom, parsed.note, user.id,
  );
  if ('error' in created) return formFailed(created.error);

  const copied = copyFrom === ''
    ? 0
    : await copyRatesInto(client, tenant.clubId, copyFrom, created.id);

  revalidatePath('/registrar/fees');
  return formOk(
    copied === 0
      ? `Schedule starting ${parsed.effectiveFrom} published. Add its rates below.`
      : `Schedule starting ${parsed.effectiveFrom} published, with ${copied} rate${copied === 1 ? '' : 's'} copied. `
        + 'Change the ones that moved — the previous schedule is untouched, which is what keeps May priced at May (BR115).',
  );
}

export async function addRateAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const scheduleId = String(formData.get('scheduleId') ?? '');
  if (scheduleId === '') return formFailed('Which schedule?');

  const parsed = parseRate({
    role: String(formData.get('role') ?? ''),
    competition: String(formData.get('competition') ?? ''),
    classification: String(formData.get('classification') ?? ''),
    appointedBy: String(formData.get('appointedBy') ?? ''),
    amount: String(formData.get('amount') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  // Named before the constraint has to say it. The database still refuses
  // the duplicate — this exists so the club is told *which* row clashes
  // rather than reading a constraint name.
  const existing = await loadRates(client, tenant.clubId, scheduleId);
  const clash = duplicateOf(existing, parsed.rate);
  if (clash !== null) {
    return formFailed(
      `That cell is already defined, at $${(clash.amountCents / 100).toFixed(2)}. `
      + 'Remove it first, or narrow one of the two by naming a competition or classification.',
    );
  }

  const error = await addRate(client, tenant.clubId, scheduleId, parsed.rate);
  revalidatePath('/registrar/fees');
  return error === null ? formOk('Rate added.') : formFailed(error);
}

export async function removeRateAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const rateId = String(formData.get('rateId') ?? '');
  if (rateId === '') return formFailed('Which rate?');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const error = await removeRate(client, tenant.clubId, rateId);
  revalidatePath('/registrar/fees');
  return error === null ? formOk('Rate removed.') : formFailed(error);
}
