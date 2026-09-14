'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { reviewInterest } from '../../../data/officiating.ts';

/**
 * Adding to the referee roster, and recording what the club has sighted.
 *
 * Every action here writes through the caller's own policies — the tables
 * are narrowed to admin, registrar and coordinator, so a treasurer's
 * request is refused by the database rather than by a check here. What
 * these add is a readable message, not the control.
 */

async function clubOf(): Promise<{ client: Awaited<ReturnType<typeof createRequestClient>>; clubId: string } | null> {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return null;
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return null;
  return { client, clubId: tenant.clubId };
}

/** A tidier message than Postgres gives, without inventing what went wrong. */
function readable(message: string): string {
  if (/row-level security|permission denied/i.test(message)) {
    return 'Only an administrator, registrar or coordinator keeps the referee roster.';
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return 'That is already recorded.';
  }
  return message.replace(/^.*?:\s*/, '');
}

export async function addRefereeAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const officialNumber = String(formData.get('officialNumber') ?? '').trim();
  const startedOn = String(formData.get('startedOn') ?? '').trim();

  if (personId === '') return formFailed('Choose who to add.');

  const ctx = await clubOf();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client.from('referee_profile').insert({
    club_id: ctx.clubId,
    person_id: personId,
    official_number: officialNumber === '' ? null : officialNumber,
    started_on: startedOn === '' ? null : startedOn,
  });

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Added to the referee roster.');
}

/**
 * Record a classification (BR110).
 *
 * `sighted_at` is set only when the coordinator says they checked it
 * against the register. It is a separate question from what the level is,
 * and BR8 is a competency rule — so a level somebody stated on a form and
 * one the club verified must not read the same on the roster.
 */
export async function recordClassificationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const level = String(formData.get('level') ?? '').trim();
  const effectiveFrom = String(formData.get('effectiveFrom') ?? '').trim();
  const sighted = formData.get('sighted') !== null;

  if (personId === '' || level === '') return formFailed('Enter the classification.');
  if (effectiveFrom === '') return formFailed('Enter the date it took effect.');

  const ctx = await clubOf();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client.from('referee_classification').insert({
    club_id: ctx.clubId,
    person_id: personId,
    level,
    effective_from: effectiveFrom,
    sighted_at: sighted ? new Date().toISOString() : null,
  });

  if (error !== null) {
    return formFailed(
      /duplicate key|unique constraint/i.test(error.message)
        ? 'A classification is already recorded from that date. Correct that one rather than adding a second — two standings on one date is two answers to what they were.'
        : readable(error.message),
    );
  }

  revalidatePath('/registrar/referees');
  return formOk(
    sighted
      ? `Recorded ${level}, checked against the register.`
      : `Recorded ${level} — noted as unverified until somebody checks it.`,
  );
}

export async function recordAccreditationAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const kind = String(formData.get('kind') ?? '').trim();
  const identifier = String(formData.get('identifier') ?? '').trim();
  const issuedOn = String(formData.get('issuedOn') ?? '').trim();
  const expiresOn = String(formData.get('expiresOn') ?? '').trim();
  const verified = formData.get('verified') !== null;

  if (personId === '' || kind === '') return formFailed('Name the accreditation.');

  const ctx = await clubOf();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client.from('referee_accreditation').insert({
    club_id: ctx.clubId,
    person_id: personId,
    kind,
    identifier: identifier === '' ? null : identifier,
    issued_on: issuedOn === '' ? null : issuedOn,
    expires_on: expiresOn === '' ? null : expiresOn,
    verified_at: verified ? new Date().toISOString() : null,
  });

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk(
    verified ? `Recorded ${kind} as verified.` : `Recorded ${kind}, unverified.`,
  );
}

/** Retire an official without deleting who officiated what. */
export async function retireRefereeAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const on = String(formData.get('retiredOn') ?? '').trim();
  if (personId === '') return formFailed('Nothing to retire.');

  const ctx = await clubOf();
  if (ctx === null) return formFailed('Sign in first.');

  const { error } = await ctx.client
    .from('referee_profile')
    .update({ retired_on: on === '' ? new Date().toISOString().slice(0, 10) : on })
    .eq('club_id', ctx.clubId)
    .eq('person_id', personId);

  if (error !== null) return formFailed(readable(error.message));

  revalidatePath('/registrar/referees');
  return formOk('Retired. Their record stays — who officiated what is still answerable.');
}

/**
 * Accept or decline a declaration (BR136, scope 39).
 *
 * Accepting creates the referee profile and the season role, and records
 * the declared level as an **unsighted** classification — which BR138 then
 * refuses to count until somebody checks it against the register. The club
 * gains a referee and gains nothing it has not verified.
 */
export async function reviewInterestAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const interestId = String(formData.get('interestId') ?? '');
  const accept = String(formData.get('accept') ?? '') === 'yes';
  if (interestId === '') return formFailed('Which declaration?');

  const client = await createRequestClient();
  const result = await reviewInterest(
    client, interestId, accept, String(formData.get('note') ?? '').trim() || null,
  );

  revalidatePath('/registrar/referees');
  if ('error' in result) return formFailed(result.error);

  const unchecked = 'Any level they declared is recorded as unchecked until somebody sights it '
    + 'against the register — an unsighted level counts towards nothing (BR138).';

  switch (result.outcome) {
    case 'declined':
      return formOk('Declined, and recorded as declined rather than removed.');
    case 'accepted_without_role':
      // BR84 refused it. Said plainly, because the club's next action is a
      // card rather than a shrug.
      return formOk(
        `Accepted — but they cannot hold the referee role yet: an adult needs a verified Working `
        + `with Children Check covering the end of the season (BR84). Record the card and they are `
        + `an official. ${unchecked}`,
      );
    case 'accepted_without_season':
      return formOk(`Accepted. There is no current season to attach the role to. ${unchecked}`);
    default:
      return formOk(`Accepted. They are a match official for this season. ${unchecked}`);
  }
}
