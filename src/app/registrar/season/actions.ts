'use server';

import { revalidatePath } from 'next/cache';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

import { loadTenantContext, updateSeasonRequirements } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseAmountCents } from '../../../web/money.ts';
import { parseDocumentChecklist } from '../../../web/people-view.ts';
import { setClubCompetition } from '../../../data/competitions.ts';

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

/**
 * Say whether this club plays in a competition (BR134).
 *
 * The catalogue is shared and unwritable from here; participation is the
 * club's own row, with an ordinary tenant-scoped policy.
 */
export async function setClubCompetitionAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const competitionId = String(formData.get('competitionId') ?? '');
  const plays = String(formData.get('plays') ?? '') === 'yes';
  if (seasonId === '' || competitionId === '') return formFailed('Which competition?');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const error = await setClubCompetition(client, tenant.clubId, seasonId, competitionId, plays);

  revalidatePath('/registrar/season');
  revalidatePath('/registrar/fixtures');
  return error === null
    ? formOk(plays ? 'Added to this season.' : 'Removed from this season.')
    : formFailed(error.replace(/^.*?:\s*/, ''));
}
