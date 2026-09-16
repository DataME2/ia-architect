'use server';

import { revalidatePath } from 'next/cache';

import { markNotificationRead } from '../../../data/inbox.ts';
import { createRequestClient } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * Marks one of the caller's own notifications read.
 *
 * There is no argument here the caller could vary to reach somebody else's
 * — the policy refuses an id that is not theirs, so a wrong or stale id
 * fails exactly the way a right one that was already read would: quietly,
 * with nothing left to show for it.
 */
export async function markNotificationReadAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const notificationId = String(formData.get('notificationId') ?? '');
  if (notificationId === '') return formFailed('Nothing to mark read.');

  const client = await createRequestClient();
  const error = await markNotificationRead(client, notificationId);
  if (error !== null) return formFailed(error);

  revalidatePath('/registrar', 'layout');
  return formOk('Marked read.');
}
