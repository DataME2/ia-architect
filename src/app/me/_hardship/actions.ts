'use server';

import { revalidatePath } from 'next/cache';

import { decideHardship, requestHardship } from '../../../data/hardship.ts';
import { loadMe } from '../../../data/me.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

async function signedInLink(clubId: string) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return null;
  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  return link === undefined ? null : { client, link };
}

/** A family asks the committee for hardship (BR164). The requester is the signed-in person. */
export async function requestHardshipAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (clubId === '' || registrationId === '' || personId === '') return formFailed('Which player?');
  if (reason === '') return formFailed('Tell the committee why — it decides on the reason you give.');

  const signedIn = await signedInLink(clubId);
  if (signedIn === null) return formFailed('Sign in first.');

  const error = await requestHardship(signedIn.client, clubId, registrationId, personId, signedIn.link.personId, reason);
  revalidatePath('/me');
  return error === null ? formOk('Sent to the committee. You will see its decision here.') : formFailed(error);
}

/** The committee approves until a date, or declines with a reason (BR164). */
export async function decideHardshipAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const requestId = String(formData.get('requestId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  const validUntil = String(formData.get('validUntil') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  if (requestId === '' || (decision !== 'approve' && decision !== 'decline')) return formFailed('Approve or decline?');
  if (decision === 'approve' && validUntil === '') return formFailed('An approval runs until a date.');
  if (decision === 'decline' && note === '') return formFailed('Say why it is declined.');

  const signedIn = await signedInLink(clubId);
  if (signedIn === null) return formFailed('Sign in first.');

  const error = await decideHardship(
    signedIn.client, requestId, decision === 'approve', decision === 'approve' ? validUntil : null, note === '' ? null : note,
  );
  revalidatePath('/me');
  return error === null
    ? formOk(decision === 'approve' ? `Approved until ${validUntil}. Recorded with your name.` : 'Declined, with your reason recorded.')
    : formFailed(error);
}
