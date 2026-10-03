'use server';

import { revalidatePath } from 'next/cache';

import { loadMe } from '../../../data/me.ts';
import { recordMatchConfirmation } from '../../../data/match-confirmation.ts';
import { nominatePayout } from '../../../data/payouts.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseMatchConfirmation } from '../../../web/match-confirmation-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { parseNomination } from '../../../web/payout-nomination.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * A guardian confirming a MiniRef's match happened (BR151).
 *
 * The confirmer is **the signed-in person**, resolved from their own link
 * at this club and never read off the form — `answerParticipationAction`'s
 * shape, moved. Migration 0055's `with check` refuses a confirmation
 * recorded in anybody else's name regardless.
 */
export async function confirmMatchAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  if (clubId === '') return formFailed('Which club?');

  const parsed = parseMatchConfirmation({
    fixtureId: String(formData.get('fixtureId') ?? ''),
    personId: String(formData.get('personId') ?? ''),
    goalsFor: String(formData.get('goalsFor') ?? ''),
    goalsAgainst: String(formData.get('goalsAgainst') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await recordMatchConfirmation(
    client, clubId, parsed.fixtureId, parsed.personId, link.personId, parsed.goalsFor, parsed.goalsAgainst,
  );

  revalidatePath('/me');
  revalidatePath('/registrar/fixtures');
  if (error !== null) return formFailed(error);

  return formOk('Confirmed — thank you. The fixture is marked played.');
}


/**
 * Nominate where an official is paid (BR161). The nominator is the
 * signed-in person, never the form; 0072's policy admits only whoever
 * chooses pay-or-credit for that official (BR152), and refuses anyone else.
 */
export async function nominatePayoutAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  if (clubId === '' || personId === '') return formFailed('Which official?');

  const parsed = parseNomination(Object.fromEntries(formData));
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await nominatePayout(client, clubId, personId, link.personId, parsed.value);
  revalidatePath('/me');
  return error === null ? formOk('Saved. The treasurer pays there from now on.') : formFailed(error);
}
