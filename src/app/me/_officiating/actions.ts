'use server';

import { revalidatePath } from 'next/cache';

import { loadMe } from '../../../data/me.ts';
import { recordMatchConfirmation } from '../../../data/match-confirmation.ts';
import { nominatePayout } from '../../../data/payouts.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseMatchConfirmation } from '../../../web/match-confirmation-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { parseNomination } from '../../../web/payout-nomination.ts';
import { addOwnAway, removeOwnAway, setOwnWeek } from '../../../data/own-availability.ts';
import { rangeProblem } from '../../../web/availability-view.ts';
import { parseCells, windowsFromGrid } from '../../../web/referee-board.ts';
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

/** The official's own link at a club, resolved from the session, never the form. */
async function ownLink(clubId: string) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return { error: 'Sign in first.' } as const;
  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return { error: 'That is not your club.' } as const;
  return { client, link } as const;
}

/** BR174: the official's week, from the grid, replaced as a whole. */
export async function saveOwnWeekAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const cells = parseCells(String(formData.get('cells') ?? ''));
  if (cells === null) return formFailed('The grid did not come through. Reload and try again.');
  const own = await ownLink(clubId);
  if ('error' in own) return formFailed(own.error);
  if (own.link.season === null) return formFailed('There is no current season to declare it for.');
  const error = await setOwnWeek(own.client, clubId, own.link.season.id, windowsFromGrid(cells));
  revalidatePath('/me');
  return error === null ? formOk('Saved. The coordinator now offers you matches in these times.') : formFailed(error);
}

/** BR174: a period the official is away. */
export async function addOwnAwayAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const startsOn = String(formData.get('startsOn') ?? '');
  const endsOn = String(formData.get('endsOn') ?? '');
  const problem = rangeProblem(startsOn, endsOn);
  if (problem !== null) return formFailed(problem);
  const own = await ownLink(clubId);
  if ('error' in own) return formFailed(own.error);
  const reason = String(formData.get('reason') ?? '').trim();
  const error = await addOwnAway(own.client, clubId, own.link.personId, startsOn, endsOn, reason === '' ? null : reason);
  revalidatePath('/me');
  return error === null ? formOk('Recorded. You will not be offered a match in that period.') : formFailed(error);
}

export async function removeOwnAwayAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  const id = String(formData.get('id') ?? '');
  if (id === '') return formFailed('Which period?');
  const own = await ownLink(clubId);
  if ('error' in own) return formFailed(own.error);
  const error = await removeOwnAway(own.client, clubId, id);
  revalidatePath('/me');
  return error === null ? formOk('Removed.') : formFailed(error);
}
