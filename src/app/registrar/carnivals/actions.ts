'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  addEntry, addFixture, createEvent, publishEvent, recordResult,
} from '../../../data/carnivals.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

async function tenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');
  const t = await loadTenantContext(client, user.id);
  if (t === null) throw new Error('This account is not a member of any club.');
  return { client, user, tenant: t };
}

export async function createEventAction(_p: FormResult, form: FormData): Promise<FormResult> {
  const name = String(form.get('name') ?? '').trim();
  const startsOn = String(form.get('startsOn') ?? '').trim();
  const endsOn = String(form.get('endsOn') ?? '').trim() || startsOn;
  if (name === '') return formFailed('What is the carnival called?');
  if (startsOn === '') return formFailed('When does it start?');

  const { client, user, tenant: t } = await tenant();
  const error = await createEvent(
    client, t.clubId, user.id, name, startsOn, endsOn,
    String(form.get('venue') ?? '').trim() || null,
  );

  revalidatePath('/registrar/carnivals');
  return error === null
    // Said explicitly because BR140 makes publication the whole of P6's
    // exception, and a coordinator should never be surprised by it.
    ? formOk(`${name} created — and not published. Nobody outside this club can see it yet.`)
    : formFailed(error.replace(/^.*?:\s*/, ''));
}

export async function addEntryAction(_p: FormResult, form: FormData): Promise<FormResult> {
  const eventId = String(form.get('eventId') ?? '');
  const entrantName = String(form.get('entrantName') ?? '').trim();
  const teamName = String(form.get('teamName') ?? '').trim();
  if (eventId === '' || entrantName === '' || teamName === '') {
    return formFailed('Which club, and which team?');
  }

  const { client, tenant: t } = await tenant();
  const error = await addEntry(
    client, t.clubId, eventId, entrantName, teamName,
    String(form.get('ageGroup') ?? '').trim() || null,
  );

  revalidatePath('/registrar/carnivals');
  return error === null
    ? formOk(`${entrantName} ${teamName} entered.`)
    : formFailed(error.replace(/^.*?:\s*/, ''));
}

export async function addFixtureAction(_p: FormResult, form: FormData): Promise<FormResult> {
  const eventId = String(form.get('eventId') ?? '');
  const home = String(form.get('homeEntryId') ?? '');
  const away = String(form.get('awayEntryId') ?? '');
  const playedOn = String(form.get('playedOn') ?? '').trim();

  if (eventId === '' || home === '' || away === '') return formFailed('Which two teams?');
  if (home === away) return formFailed('A team cannot play itself.');
  if (playedOn === '') return formFailed('When is it played?');

  const { client, tenant: t } = await tenant();
  const error = await addFixture(
    client, t.clubId, eventId, home, away, playedOn,
    String(form.get('kickOff') ?? '').trim() || null,
    String(form.get('venue') ?? '').trim() || null,
  );

  revalidatePath('/registrar/carnivals');
  return error === null ? formOk('Added to the draw.') : formFailed(error.replace(/^.*?:\s*/, ''));
}

export async function recordResultAction(_p: FormResult, form: FormData): Promise<FormResult> {
  const fixtureId = String(form.get('fixtureId') ?? '');
  const status = String(form.get('status') ?? 'played');
  if (fixtureId === '') return formFailed('Which fixture?');

  const score = (name: string): number | null => {
    const raw = String(form.get(name) ?? '').trim();
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };
  const home = score('homeGoals');
  const away = score('awayGoals');

  // The database refuses half a score; saying so here is kinder than an
  // error about a check constraint.
  if ((home === null) !== (away === null)) {
    return formFailed('Record both scores, or neither — a ladder from half a result is a guess.');
  }

  const { client } = await tenant();
  const error = await recordResult(client, fixtureId, home, away, status);

  revalidatePath('/registrar/carnivals');
  return error === null ? formOk('Result recorded.') : formFailed(error.replace(/^.*?:\s*/, ''));
}

/**
 * BR140 — the act that invokes P6.
 *
 * The message says what it means in plain words, because "publish" in most
 * products means "save" and here it means **anyone on the internet can read
 * this**.
 */
export async function publishAction(_p: FormResult, form: FormData): Promise<FormResult> {
  const eventId = String(form.get('eventId') ?? '');
  const publish = String(form.get('publish') ?? '') === 'yes';
  if (eventId === '') return formFailed('Which carnival?');

  const { client } = await tenant();
  const error = await publishEvent(client, eventId, publish);

  revalidatePath('/registrar/carnivals');
  if (error !== null) return formFailed(error);

  return formOk(publish
    ? 'Published. The draw and standings are now readable by anyone with the link, with no account '
      + '— no player’s name appears, and none is held against these fixtures.'
    : 'Taken down. Nobody outside the club can see it now — though anything already copied or '
      + 'screenshotted is out there, and taking it down does not recall it.');
}
