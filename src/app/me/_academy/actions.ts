'use server';

import { revalidatePath } from 'next/cache';

import { addNights, loadGameSheet, recordMarks, saveGameTime } from '../../../data/academy.ts';
import { setTeamAcademy } from '../../../data/check-in.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseAttendanceMarks, parseGameTime, parseTrainingNights } from '../../../web/academy.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

/**
 * The academy's writes (scope 112). Each one only parses and passes on:
 * who may add a night, mark a sheet or record game time is 0095's
 * policies, and their refusal is shown as written.
 */

const entries = (formData: FormData): [string, string][] =>
  [...formData.entries()].map(([k, v]) => [k, String(v)]);

async function signedIn() {
  const client = await createRequestClient();
  return (await currentUser(client)) === null ? null : client;
}

/** A Technical Lead adds one night, or the same night weekly (#114). */
export async function addTrainingNightsAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const parsed = parseTrainingNights({
    teamId: String(formData.get('teamId') ?? ''),
    from: String(formData.get('from') ?? ''),
    until: String(formData.get('until') ?? ''),
    startsAt: String(formData.get('startsAt') ?? ''),
    endsAt: String(formData.get('endsAt') ?? ''),
    venue: String(formData.get('venue') ?? ''),
  });
  if (clubId === '') return formFailed('Which club?');
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await addNights(client, clubId, parsed);
  revalidatePath('/me');
  if (error !== null) return formFailed(error);
  return formOk(
    parsed.dates.length === 1 ? 'Training night added.' : `${parsed.dates.length} weekly training nights added.`,
  );
}

/** The coach's (or manager's) sheet for one night. */
export async function markAttendanceAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '');
  if (clubId === '' || sessionId === '') return formFailed('Which night?');
  const parsed = parseAttendanceMarks(entries(formData), formData.getAll('player').map(String));
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await recordMarks(client, clubId, sessionId, parsed.marks);
  revalidatePath('/me');
  if (error !== null) return formFailed(error);
  return formOk(`${parsed.marks.length} marked.`);
}

/** Minutes by position, from the live tracker or the after-the-match form. */
export async function saveGameTimeAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const fixtureId = String(formData.get('fixtureId') ?? '');
  if (clubId === '' || fixtureId === '') return formFailed('Which game?');

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const sheet = await loadGameSheet(client, clubId, fixtureId);
  if (sheet === null) return formFailed('That game has no team, so there is nobody to record.');

  const parsed = parseGameTime(entries(formData), sheet.players.map((p) => p.personId));
  if (!parsed.ok) return formFailed(parsed.message);
  const error = await saveGameTime(client, clubId, sheet, parsed.rows);
  revalidatePath('/me');
  revalidatePath(`/me/game-time/${fixtureId}`);
  if (error !== null) return formFailed(error);
  return formOk(`Game time saved for ${parsed.rows.length} ${parsed.rows.length === 1 ? 'player' : 'players'}.`);
}

/** BR184: a Technical Lead marks a team as academy, or unmarks it. */
export async function setAcademyTeamAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const teamId = String(formData.get('teamId') ?? '');
  const academy = formData.get('academy') === 'true';
  if (teamId === '') return formFailed('Which team?');

  const client = await signedIn();
  if (client === null) return formFailed('Sign in first.');
  const error = await setTeamAcademy(client, teamId, academy);
  revalidatePath('/me');
  if (error !== null) return formFailed(error);
  return formOk(academy ? 'Marked as an academy team.' : 'No longer an academy team.');
}
