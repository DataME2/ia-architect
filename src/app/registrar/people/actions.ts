'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext, setSeasonRole } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseSeasonRole } from '../../../web/people-view.ts';

/**
 * Grant or revoke one season role (P1).
 *
 * The club is re-derived from the session, never read from the form. A
 * `club_id` posted by a browser is an assertion by whoever is on the other
 * end of it; the membership row is the fact — and the policy on
 * `person_role` is what actually enforces it either way.
 */
export async function setRoleAction(formData: FormData): Promise<void> {
  const personId = String(formData.get('personId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  const role = parseSeasonRole(formData.get('role'));
  const granted = formData.get('granted') === '1';

  if (personId === '' || seasonId === '') throw new Error('Missing identifiers.');
  if (role === null) throw new Error('That is not a season role.');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  await setSeasonRole(client, tenant.clubId, personId, seasonId, role, granted, user.id);

  revalidatePath('/registrar/people');
}
