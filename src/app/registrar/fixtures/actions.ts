'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { loadFixtureForNotice, notifyFixtureParticipants } from '../../../data/notifications.ts';
import { describeFixtureChange } from '../../../web/fixture-change.ts';

/**
 * Record a game the club played.
 *
 * The competition is free text because C11 does not exist: forcing a club to
 * pick from a catalogue nobody has entered would leave the field blank on
 * every fixture.
 */
export async function createFixtureAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const playedOn = String(formData.get('playedOn') ?? '').trim();
  const opponent = String(formData.get('opponent') ?? '').trim();
  const homeAway = String(formData.get('homeAway') ?? 'home');

  if (seasonId === '') return formFailed('No season.');
  if (playedOn === '') return formFailed('When was it played?');
  if (opponent === '') return formFailed('Who was it against?');
  if (!['home', 'away', 'neutral'].includes(homeAway)) return formFailed('Home, away or neutral?');

  const score = (name: string): number | null => {
    const raw = String(formData.get(name) ?? '').trim();
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const { error } = await client.from('fixture').insert({
    club_id: tenant.clubId,
    season_id: seasonId,
    played_on: playedOn,
    opponent,
    home_away: homeAway,
    // R27.2 — a reference, and never the free-text column, which a trigger
    // now refuses on insert. Null is a friendly or a trial (#78).
    competition_id: String(formData.get('competitionId') ?? '').trim() || null,
    venue: String(formData.get('venue') ?? '').trim() || null,
    goals_for: score('goalsFor'),
    goals_against: score('goalsAgainst'),
    status: String(formData.get('status') ?? 'played'),
    recorded_by: user.id,
  });

  if (error !== null) {
    return formFailed(
      error.message.includes('played_on')
        ? `A fixture against ${opponent} on ${playedOn} is already recorded.`
        : error.message,
    );
  }

  revalidatePath('/registrar/fixtures');
  return formOk(`Fixture against ${opponent} recorded.`);
}

/**
 * Change a fixture's time, venue or status — and tell everyone (BR64).
 *
 * [Scope 36](../../../../docs/scope/36_the_platform_learns_to_send_and_to_stop.md)
 * built `notifyFixtureChanged` and left it with no caller, because nothing
 * in the application edited a fixture. This is that caller.
 *
 * The notification never fails the edit. The record is the thing that had
 * to happen — BR64 says the platform's record stays authoritative over any
 * cached or previously-notified copy, so a change that saved and was not
 * announced is recoverable, and one that was announced and not saved is
 * not.
 */
export async function updateFixtureAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const fixtureId = String(formData.get('fixtureId') ?? '');
  if (fixtureId === '') return formFailed('Which fixture?');

  const kickOff = String(formData.get('kickOff') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!['played', 'scheduled', 'cancelled', 'abandoned'].includes(status)) {
    return formFailed('What is the fixture’s status?');
  }

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const before = await loadFixtureForNotice(client, tenant.clubId, fixtureId);
  if (before === null) return formFailed('That fixture is no longer here.');

  const { error } = await client
    .from('fixture')
    .update({ kick_off: kickOff || null, venue: venue || null, status })
    .eq('club_id', tenant.clubId)
    .eq('id', fixtureId);

  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  // What actually changed, in the words a participant will read. Computed
  // from before and after rather than from the form, so a submit that
  // changed nothing announces nothing.
  const changes = describeFixtureChange(before, { kickOff: kickOff || null, venue: venue || null, status });

  revalidatePath('/registrar/fixtures');

  if (changes === null) return formOk('Saved. Nothing changed, so nobody was told.');

  const told = await notifyFixtureParticipants(client, tenant, fixtureId, before, changes);
  return formOk(`Saved — ${changes}. ${told}`);
}
