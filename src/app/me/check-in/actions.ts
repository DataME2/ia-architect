'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  addSession,
  grantCheckInConsent,
  removeSession,
  saveWellbeing,
  withdrawCheckInConsent,
} from '../../../data/check-in.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseScores, parseSession } from '../../../web/check-in.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * The daily check-in's writes (scope 113). Each one parses and passes on:
 * who may write, and under whose consent, is 0096's to decide, and its
 * refusal is shown as written. The day is the club's today, never the form's.
 */

async function signedIn() {
  const client = await createRequestClient();
  return (await currentUser(client)) === null ? null : client;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/** Today's five answers. On success, the *Done for today* summary. */
export async function saveCheckInAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = field(formData, 'clubId');
  const personId = field(formData, 'personId');
  if (clubId === '' || personId === '') return formFailed('Whose check-in?');
  const parsed = parseScores([...formData.entries()].map(([k, v]) => [k, String(v)] as const));
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await saveWellbeing(client, clubId, personId, todayIn(), parsed.scores);
  if (error !== null) return formFailed(error);
  revalidatePath('/me');
  redirect(`/me/check-in?${new URLSearchParams({ club: clubId })}`);
}

/** A session done today or in the last seven days. */
export async function addSessionAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = field(formData, 'clubId');
  const personId = field(formData, 'personId');
  if (clubId === '' || personId === '') return formFailed('Whose session?');
  const parsed = parseSession({ on: field(formData, 'on'), kind: field(formData, 'kind'), rpe: field(formData, 'rpe') }, todayIn());
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await addSession(client, clubId, personId, parsed);
  revalidatePath('/me/check-in');
  if (error !== null) return formFailed(error);
  return formOk('Session added.');
}

/** The player takes a session away; this needs no consent (0096). */
export async function removeSessionAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = field(formData, 'clubId');
  const sessionId = field(formData, 'sessionId');
  if (clubId === '' || sessionId === '') return formFailed('Which session?');
  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await removeSession(client, clubId, sessionId);
  revalidatePath('/me/check-in');
  if (error !== null) return formFailed(error);
  return formOk('Session removed.');
}

/** BR185: the guardian, or the player from 18, agrees. */
export async function grantCheckInConsentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = field(formData, 'clubId');
  const personId = field(formData, 'personId');
  if (clubId === '' || personId === '') return formFailed('For whom?');
  if (formData.get('agree') !== 'on') return formFailed('Tick the box to agree.');
  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await grantCheckInConsent(client, clubId, personId);
  revalidatePath('/me');
  revalidatePath('/me/check-in');
  if (error !== null) return formFailed(error);
  return formOk('Thank you. The daily check-in is open.');
}

/** BR185: withdrawing stops new entries at once. */
export async function withdrawCheckInConsentAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = field(formData, 'clubId');
  const personId = field(formData, 'personId');
  if (clubId === '' || personId === '') return formFailed('For whom?');
  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await withdrawCheckInConsent(client, clubId, personId);
  revalidatePath('/me');
  revalidatePath('/me/check-in');
  if (error !== null) return formFailed(error);
  return formOk('Withdrawn. No new check-ins will be asked for or kept.');
}
