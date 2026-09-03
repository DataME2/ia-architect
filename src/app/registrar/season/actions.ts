'use server';

import { revalidatePath } from 'next/cache';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

import { loadTenantContext, updateSeasonRequirements } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseAmountCents } from '../../../web/money.ts';
import { parseDocumentChecklist } from '../../../web/people-view.ts';

/**
 * Set what a season requires and what it costs (BR2, BR3).
 *
 * Returns a message rather than throwing on bad input: a mistyped fee is an
 * ordinary thing for a registrar to do, and a stack trace is not an answer
 * to it. A missing identifier is different — nothing typed into the form can
 * cause it — so that still throws.
 */
export async function saveRequirementsAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') throw new Error('Missing identifiers.');

  const fee = parseAmountCents(String(formData.get('fee') ?? ''));
  if (!fee.ok) return formFailed(fee.error);
  if (fee.cents < 0) return formFailed('A registration fee cannot be negative.');

  const checklist = parseDocumentChecklist(String(formData.get('documents') ?? ''));

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  await updateSeasonRequirements(
    client,
    tenant.clubId,
    seasonId,
    checklist,
    fee.cents,
    user.id,
  );

  revalidatePath('/registrar/season');
  revalidatePath('/registrar');
  return formOk('Season requirements saved.');
}
