'use server';

import { revalidatePath } from 'next/cache';

import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { loadTenantContext } from '../../../../data/queries.ts';
import { formFailed, formOk, type FormResult } from '../../../../web/form-result.ts';

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward', 'utility'];
const FEET = ['left', 'right', 'both'];

function optionalNumber(raw: string, label: string, min: number, max: number):
  | { ok: true; value: number | null }
  | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, value: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, error: `${label} is not a number.` };
  if (n < min || n > max) {
    return { ok: false, error: `${label} of ${trimmed} is outside anything plausible.` };
  }
  return { ok: true, value: n };
}

/**
 * Record a player's physique, position and squad number.
 *
 * Everything is optional, deliberately (BR99): a form that refuses to save
 * without a child's weight is a form somebody completes with a guess.
 */
export async function savePlayerProfileAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const registrationId = String(formData.get('registrationId') ?? '');
  if (registrationId === '') return formFailed('No registration.');

  const height = optionalNumber(String(formData.get('heightCm') ?? ''), 'Height', 50, 250);
  if (!height.ok) return formFailed(height.error);

  const weight = optionalNumber(String(formData.get('weightKg') ?? ''), 'Weight', 10, 200);
  if (!weight.ok) return formFailed(weight.error);

  const squad = optionalNumber(String(formData.get('squadNumber') ?? ''), 'Squad number', 1, 99);
  if (!squad.ok) return formFailed(squad.error);

  const position = String(formData.get('preferredPosition') ?? '');
  const secondary = String(formData.get('secondaryPosition') ?? '');
  const foot = String(formData.get('preferredFoot') ?? '');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const { error } = await client.from('player_profile').upsert(
    {
      club_id: tenant.clubId,
      registration_id: registrationId,
      height_cm: height.value,
      weight_kg: weight.value,
      preferred_position: POSITIONS.includes(position) ? position : null,
      secondary_position: POSITIONS.includes(secondary) ? secondary : null,
      preferred_foot: FEET.includes(foot) ? foot : null,
      squad_number: squad.value,
      recorded_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'registration_id' },
  );

  if (error !== null) return formFailed(error.message);

  revalidatePath(`/registrar/players/${registrationId}`);
  return formOk('Player details saved.');
}

/**
 * Record that a player took part in a fixture.
 *
 * Note what is *not* checked: whether they were eligible. BR103 — an
 * appearance by a player who owed money or was not confirmed by the
 * federation is recorded and flagged, never refused, because blocking the
 * entry would not un-play the match. The flag is shown on the profile.
 */
export async function recordAppearanceAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const fixtureId = String(formData.get('fixtureId') ?? '');
  if (registrationId === '' || personId === '' || fixtureId === '') {
    return formFailed('Choose a fixture.');
  }

  const minutes = optionalNumber(String(formData.get('minutes') ?? '0'), 'Minutes', 0, 200);
  if (!minutes.ok) return formFailed(minutes.error);
  const goals = optionalNumber(String(formData.get('goals') ?? '0'), 'Goals', 0, 99);
  if (!goals.ok) return formFailed(goals.error);
  const assists = optionalNumber(String(formData.get('assists') ?? '0'), 'Assists', 0, 99);
  if (!assists.ok) return formFailed(assists.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return formFailed('No club.');

  const { error } = await client.from('appearance').insert({
    club_id: tenant.clubId,
    fixture_id: fixtureId,
    person_id: personId,
    registration_id: registrationId,
    minutes_played: minutes.value ?? 0,
    started: formData.get('started') === 'on',
    goals: goals.value ?? 0,
    assists: assists.value ?? 0,
    // BR101: a statistic here is one person's recollection, so the record
    // says whose.
    recorded_by: user.id,
  });

  if (error !== null) {
    return formFailed(
      error.message.includes('appearance_fixture_id_person_id_key')
        ? 'This player is already recorded in that fixture. Edit the existing entry instead.'
        : error.message,
    );
  }

  revalidatePath(`/registrar/players/${registrationId}`);
  return formOk('Appearance recorded.');
}
