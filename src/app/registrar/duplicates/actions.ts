'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext, mergePerson } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';

/**
 * Fold one Person into another, on a registrar's say-so (BR82).
 *
 * BR5 has always said a duplicate is surfaced for a human and never merged
 * automatically — a wrong merge attaches one child's registration, payments
 * and eligibility to a different child. This is the action that human's
 * decision calls, and the survivor is *their* choice, not the system's.
 */
export async function mergePersonAction(formData: FormData): Promise<void> {
  const survivorId = String(formData.get('survivorId') ?? '');
  const duplicateId = String(formData.get('duplicateId') ?? '');
  if (survivorId === '' || duplicateId === '') throw new Error('Missing identifiers.');
  if (survivorId === duplicateId) throw new Error('A person cannot be merged into themselves.');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  // The club is not passed to the function: it reads both people's clubs and
  // refuses a cross-club merge outright, on top of the policies that already
  // stop this caller reaching another club's rows.
  await mergePerson(client, survivorId, duplicateId);

  revalidatePath('/registrar/duplicates');
  revalidatePath('/registrar/people');
  revalidatePath('/registrar');
}
