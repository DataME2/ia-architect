'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

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
    competition: String(formData.get('competition') ?? '').trim() || null,
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
