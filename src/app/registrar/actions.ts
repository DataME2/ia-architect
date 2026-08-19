'use server';

import { revalidatePath } from 'next/cache';

import {
  loadRegistrationDetail,
  loadTenantContext,
  persistValidation,
  verifyLegalName,
} from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { todayIn } from '../../web/today.ts';

/**
 * Every action re-derives the tenant from the session rather than trusting a
 * form field. A `club_id` posted from the browser is an assertion by whoever
 * is on the other end of it; the membership row is the fact.
 */
async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

/**
 * Record that a club officer checked the legal name against a document.
 *
 * BR55. This is the one field the family cannot complete for themselves —
 * holding a legal name and having verified it are different claims, and only
 * the second survives contact with the federation.
 */
export async function verifyLegalNameAction(formData: FormData): Promise<void> {
  const personId = String(formData.get('personId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (personId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  // The `club_id` filter inside verifyLegalName is belt and braces; the
  // policy is what actually stops this touching another club's row.
  await verifyLegalName(client, tenant.clubId, personId, user.id);

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/**
 * Re-run the rules and append the result to `validation_result`.
 *
 * Appending rather than replacing is the point: the table has no update or
 * delete policy, so the history accumulates and "what was wrong with this in
 * March?" stays answerable.
 */
export async function recheckAction(formData: FormData): Promise<void> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  if (registrationId === '' || seasonId === '') throw new Error('Missing identifiers.');

  const { client, tenant } = await requireTenant();

  const detail = await loadRegistrationDetail(
    client,
    tenant.clubId,
    seasonId,
    registrationId,
    todayIn(),
  );
  if (detail === null) throw new Error('Registration not found.');

  await persistValidation(client, tenant.clubId, registrationId, detail.entry.outcomes);

  revalidatePath(`/registrar/${registrationId}`);
}
