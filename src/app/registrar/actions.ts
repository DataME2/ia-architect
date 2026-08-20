'use server';

import { revalidatePath } from 'next/cache';

import {
  applySeasonChecklist,
  loadRegistrationDetail,
  loadSeasons,
  loadTenantContext,
  persistValidation,
  setDocumentProvided,
  setOutstandingAmount,
  verifyLegalName,
} from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { parseAmountCents } from '../../web/money.ts';
import { todayIn } from '../../web/today.ts';

/**
 * Every action re-derives the tenant from the session rather than trusting a
 * form field. A `club_id` posted from the browser is an assertion by whoever
 * is on the other end of it; the membership row is the fact.
 */
async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

/**
 * Record that a club officer checked the legal name against a document.
 *
 * BR55. This is the one field the family cannot complete for themselves —
 * holding a legal name and having verified it are different claims, and only
 * the second survives contact with the federation.
 */
export async function verifyLegalNameAction(formData: FormData): Promise<void> {
  const personId = String(formData.get('personId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (personId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  // The `club_id` filter inside verifyLegalName is belt and braces; the
  // policy is what actually stops this touching another club's row.
  await verifyLegalName(client, tenant.clubId, personId, user.id);

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/**
 * Re-run the rules and append the result to `validation_result`.
 *
 * Appending rather than replacing is the point: the table has no update or
 * delete policy, so the history accumulates and "what was wrong with this in
 * March?" stays answerable.
 */
export async function recheckAction(formData: FormData): Promise<void> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  if (registrationId === '' || seasonId === '') throw new Error('Missing identifiers.');

  const { client, tenant } = await requireTenant();

  const detail = await loadRegistrationDetail(
    client,
    tenant.clubId,
    seasonId,
    registrationId,
    todayIn(),
  );
  if (detail === null) throw new Error('Registration not found.');

  await persistValidation(client, tenant.clubId, registrationId, detail.entry.outcomes);

  revalidatePath(`/registrar/${registrationId}`);
}

/**
 * Record that a required document arrived, or that it did not (BR2).
 *
 * A time, not a flag: "when did the club receive the working-with-children
 * check" is a question a safeguarding audit asks, and a boolean has no
 * answer to it.
 */
export async function setDocumentProvidedAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get('documentId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  const provided = formData.get('provided') === '1';
  if (documentId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();
  await setDocumentProvided(
    client,
    tenant.clubId,
    documentId,
    registrationId,
    provided,
    user.id,
  );

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/**
 * Copy this season's checklist onto a registration that has none.
 *
 * Deliberate and audited rather than automatic. A registration created
 * before the season had a checklist is not retrospectively in breach of it,
 * and turning a family's completed registration into a blocked one overnight
 * is not a thing to do by migration.
 */
export async function applyChecklistAction(formData: FormData): Promise<void> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  if (registrationId === '' || seasonId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  const seasons = await loadSeasons(client, tenant.clubId);
  const season = seasons.find((s) => s.id === seasonId);
  if (season === undefined) throw new Error('Season not found.');

  await applySeasonChecklist(
    client,
    tenant.clubId,
    registrationId,
    season.required_document_types,
    user.id,
  );

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/**
 * Set what this registration still owes (BR3).
 *
 * Returns a message rather than throwing when the amount will not parse:
 * mistyping a fee is an ordinary thing to do, and a stack trace is not a
 * reply to it.
 */
export async function setOutstandingAction(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  const previousCents = Number(formData.get('previousCents') ?? 0);
  if (registrationId === '' || seasonId === '') throw new Error('Missing identifiers.');

  const amount = parseAmountCents(String(formData.get('amount') ?? ''));
  if (!amount.ok) return amount.error;

  const { client, user, tenant } = await requireTenant();
  await setOutstandingAmount(
    client,
    tenant.clubId,
    registrationId,
    Number.isFinite(previousCents) ? previousCents : 0,
    amount.cents,
    user.id,
  );

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
  return null;
}
