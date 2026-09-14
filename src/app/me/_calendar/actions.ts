'use server';

import { revalidatePath } from 'next/cache';

import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadMe } from '../../../data/me.ts';
import {
  feedUrlFor, loadSubscription, revokeSubscription, subscribeOrRotate, webcalUrlFor,
} from '../../../data/calendar.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * Subscribe, or rotate (BR31).
 *
 * The URL is shown **once, in the result**, and never rendered from stored
 * state afterwards — the same reason a registration invitation is displayed
 * once (BR73). A page that redisplays a bearer credential on every visit is
 * a page that leaks it over somebody's shoulder.
 *
 * Rotation is the same act: a new salt, and the previous URL stops
 * resolving immediately.
 */
export async function subscribeCalendarAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  if (clubId === '' || personId === '') return formFailed('Whose calendar?');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  // BR33's holder. An adult holds their own; a guardian holds a child's,
  // and the database refuses anything else.
  const existing = await loadSubscription(client, clubId, personId);
  const result = await subscribeOrRotate(client, clubId, personId, link.personId, existing);

  revalidatePath('/me');
  if ('error' in result) return formFailed(result.error);

  return formOk(
    `${existing === null ? 'Subscribed' : 'Rotated — the previous link has stopped working'}. `
    + `Add this to your calendar now; it is shown once and not again:\n\n`
    + `${webcalUrlFor(result.salt)}\n\n`
    + `If your calendar will not take a webcal: link, use ${feedUrlFor(result.salt)} instead.`,
  );
}

export async function revokeCalendarAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const subscriptionId = String(formData.get('subscriptionId') ?? '');
  if (subscriptionId === '') return formFailed('Which subscription?');

  const client = await createRequestClient();
  const error = await revokeSubscription(client, subscriptionId);

  revalidatePath('/me');
  return error === null
    ? formOk('Revoked. The link stops working immediately — though a calendar that already '
      + 'downloaded it may keep showing the last copy until it next refreshes.')
    : formFailed(error);
}
