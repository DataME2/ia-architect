'use server';

import { revalidatePath } from 'next/cache';

import { chooseSettlement } from '../../../data/claims.ts';
import { loadMe } from '../../../data/me.ts';
import { recordMatchConfirmation } from '../../../data/match-confirmation.ts';
import { nominatePayout } from '../../../data/payouts.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseMatchConfirmation } from '../../../web/match-confirmation-view.ts';
import { parseSettlement } from '../../../web/claim-view.ts';
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
 * A family's choice for an approved referee payment claim (BR152).
 *
 * The chooser is **the signed-in person**, resolved from their own link at
 * this club — `confirmMatchAction`'s shape, moved. Migration 0057's own
 * gate refuses a choice recorded in anybody else's name regardless.
 */
export async function chooseSettlementAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const clubId = String(formData.get('clubId') ?? '');
  if (clubId === '') return formFailed('Which club?');

  const parsed = parseSettlement({
    claimId: String(formData.get('claimId') ?? ''),
    settlement: String(formData.get('settlement') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Sign in first.');

  const me = await loadMe(client, user.id, todayIn());
  const link = me.links.find((l) => l.clubId === clubId);
  if (link === undefined) return formFailed('That is not your club.');

  const error = await chooseSettlement(client, clubId, parsed.claimId, parsed.settlement, link.personId);

  revalidatePath('/me');
  if (error !== null) return formFailed(error);

  return formOk(
    parsed.settlement === 'pay'
      ? 'Recorded — the club will pay you the way it already pays anyone.'
      : 'Recorded — it will be credited toward next season, once that registration is open.',
  );
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
