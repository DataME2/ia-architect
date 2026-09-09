'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { rangeProblem, windowProblem } from '../../../web/availability-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * Declaring when an official can officiate, and when they cannot.
 *
 * The validation here duplicates the database's check constraints on
 * purpose: the constraint is the guarantee, this is the sentence. A
 * coordinator who typed the times the wrong way round should be told that,
 * not shown `violates check constraint "referee_availability_check"`.
 */

async function club(): Promise<{ client: Awaited<ReturnType<typeof createRequestClient>>; clubId: string } | null> {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return null;
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return null;
  return { client, clubId: tenant.clubId };
}

function readable(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return 'Only an administrator, registrar or coordinator keeps availability.';
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return 'That window is already declared — two identical windows are not two facts.';
  }
  return message.replace(/^.*?:\s*/, '');
}

export async function declareWindowAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  const weekday = String(formData.get('weekday') ?? '');
  const fromTime = String(formData.get('fromTime') ?? '');
  const toTime = String(formData.get('toTime') ?? '');

  if (personId === '' || seasonId === '') return formFailed('Nothing to declare.');

  const problem = windowProblem(weekday, fromTime, toTime);
  if (problem !== null) return formFailed(problem.message);

  const ctx = await club();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client.from('referee_availability').insert({
    club_id: ctx.clubId,
    season_id: seasonId,
    person_id: personId,
    weekday: Number(weekday),
    // Empty means the whole day, not midnight. `''` would be rejected as a
    // time and `00:00` would silently mean something else.
    from_time: fromTime.trim() === '' ? null : fromTime,
    to_time: toTime.trim() === '' ? null : toTime,
  });

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Availability declared.');
}

export async function removeWindowAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get('windowId') ?? '');
  if (id === '') return formFailed('Nothing to remove.');

  const ctx = await club();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client
    .from('referee_availability')
    .delete()
    .eq('club_id', ctx.clubId)
    .eq('id', id);

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Window removed.');
}

export async function recordUnavailabilityAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const startsOn = String(formData.get('startsOn') ?? '');
  const endsOn = String(formData.get('endsOn') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();

  if (personId === '') return formFailed('Nothing to record.');

  const problem = rangeProblem(startsOn, endsOn);
  if (problem !== null) return formFailed(problem);

  const ctx = await club();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client.from('referee_unavailability').insert({
    club_id: ctx.clubId,
    person_id: personId,
    starts_on: startsOn,
    ends_on: endsOn,
    reason: reason === '' ? null : reason,
  });

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Recorded — this beats any standing window it covers.');
}

export async function removeUnavailabilityAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const id = String(formData.get('rangeId') ?? '');
  if (id === '') return formFailed('Nothing to remove.');

  const ctx = await club();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client
    .from('referee_unavailability')
    .delete()
    .eq('club_id', ctx.clubId)
    .eq('id', id);

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Removed.');
}
