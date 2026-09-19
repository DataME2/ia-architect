'use server';

import { revalidatePath } from 'next/cache';

import { loadMe } from '../../../data/me.ts';
import { recordMatchConfirmation } from '../../../data/match-confirmation.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseMatchConfirmation } from '../../../web/match-confirmation-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
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
    homeScore: String(formData.get('homeScore') ?? ''),
    awayScore: String(formData.get('awayScore') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.message);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await recordMatchConfirmation(
    client, clubId, parsed.fixtureId, parsed.personId, link.personId, parsed.homeScore, parsed.awayScore,
  );

  revalidatePath('/me');
  if (error !== null) return formFailed(error);

  return formOk('Confirmed — thank you.');
}
