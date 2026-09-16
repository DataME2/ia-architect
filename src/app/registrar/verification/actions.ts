'use server';

import { revalidatePath } from 'next/cache';

import { recordVerification } from '../../../data/claims.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { parseVerification } from '../../../web/claim-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * Recording what happened at a match (BR13, BR17, BR18, BR119).
 *
 * Every refusal here is the database's — this only translates it. BR119 in
 * particular is never re-checked in TypeScript: `verified_by` is the
 * signed-in user, never a value the form could set, so the only way to
 * verify your own match is to be signed in as somebody else, which is not
 * a bypass.
 */
export async function verifyAppointmentAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseVerification({
    appointmentId: String(formData.get('appointmentId') ?? ''),
    officiated: String(formData.get('officiated') ?? 'yes'),
    fixtureStatus: String(formData.get('fixtureStatus') ?? ''),
    abandonmentNote: String(formData.get('abandonmentNote') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const error = await recordVerification(
    client, tenant.clubId, parsed.appointmentId, parsed.officiated, parsed.abandonmentNote, parsed.note, user.id,
  );

  revalidatePath('/registrar/verification');
  return error === null
    ? formOk(parsed.officiated ? 'Recorded — they officiated.' : 'Recorded — they did not officiate.')
    : formFailed(error);
}
