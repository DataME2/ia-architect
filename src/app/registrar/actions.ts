'use server';

import { revalidatePath } from 'next/cache';

import {
  applyDerivedStatus,
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
import {
  cancelPaymentPlan,
  createPaymentPlan,
  recordPayment,
} from '../../data/finance.ts';
import {
  attachVoucher,
  loadVouchers,
  rejectVoucher,
  verifyVoucher,
} from '../../data/vouchers.ts';
import { parseAmountCents } from '../../web/money.ts';
import { parseDueDate, parseMethod, parsePlanDraft } from '../../web/plan-view.ts';
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

  const { client, user, tenant } = await requireTenant();

  const detail = await loadRegistrationDetail(
    client,
    tenant.clubId,
    seasonId,
    registrationId,
    todayIn(),
  );
  if (detail === null) throw new Error('Registration not found.');

  await persistValidation(client, tenant.clubId, registrationId, detail.entry.outcomes);

  // The player registration process moves a registration from draft through
  // review; until this line nothing in the code moved it at all, and the two
  // statuses that exist to say *why* it is waiting were never written.
  await applyDerivedStatus(
    client,
    tenant.clubId,
    registrationId,
    detail.entry.status,
    detail.entry.outcomes,
    user.id,
  );

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

/**
 * Agree a payment plan (BR74, BR76).
 *
 * Parsed and previewed by a pure function, checked again by
 * `createPaymentPlan`, and enforced a third time by a deferred constraint
 * trigger in the database. That is not belt and braces for its own sake:
 * only the last of the three survives a future writer who does not go
 * through this action.
 */
export async function createPlanAction(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const registrationId = String(formData.get('registrationId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  if (registrationId === '' || seasonId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  const seasons = await loadSeasons(client, tenant.clubId);
  const season = seasons.find((s) => s.id === seasonId);
  if (season === undefined) throw new Error('Season not found.');

  const draft = parsePlanDraft(
    {
      total: String(formData.get('total') ?? ''),
      count: String(formData.get('count') ?? ''),
      firstDueOn: String(formData.get('firstDueOn') ?? ''),
      cadence: formData.get('cadence'),
    },
    season.ends_on,
  );
  if (!draft.ok) return draft.error;

  const result = await createPaymentPlan(
    client,
    tenant.clubId,
    registrationId,
    { ...draft.draft, seasonEndsOn: season.ends_on },
    user.id,
  );
  if (!result.ok) return result.error;

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
  return null;
}

/**
 * End a plan.
 *
 * Stamped, never deleted — what a family was asked to pay and when the
 * arrangement ended is exactly the history a dispute turns on. BR3 goes
 * back to asking about the whole balance once it is gone.
 */
export async function cancelPlanAction(formData: FormData): Promise<void> {
  const planId = String(formData.get('planId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (planId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();
  await cancelPaymentPlan(client, tenant.clubId, planId, registrationId, user.id);

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/**
 * Record money received (BR77).
 *
 * A negative amount is legitimate — a refund, or a correction. There is no
 * edit and no delete, here or in the database: a receipt that can be
 * quietly changed is not a record of anything.
 */
export async function recordPaymentAction(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const registrationId = String(formData.get('registrationId') ?? '');
  if (registrationId === '') throw new Error('Missing identifiers.');

  const amount = parseAmountCents(String(formData.get('amount') ?? ''));
  if (!amount.ok) return amount.error;
  if (amount.cents === 0) return 'A payment of nothing is not a payment.';

  const receivedOn = parseDueDate(String(formData.get('receivedOn') ?? ''));
  if (receivedOn === null) return 'Enter the date received as a real calendar date.';

  const method = parseMethod(formData.get('method'));
  if (method === null) return 'Choose how the money arrived.';

  const referenceRaw = String(formData.get('reference') ?? '').trim();

  const { client, user, tenant } = await requireTenant();
  await recordPayment(
    client,
    tenant.clubId,
    registrationId,
    {
      amountCents: amount.cents,
      receivedOn,
      method,
      reference: referenceRaw === '' ? null : referenceRaw,
      reversesPaymentId: null,
    },
    user.id,
  );

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
  return null;
}

/**
 * Attach a voucher (BR81).
 *
 * Open to the registrar as well as the treasurer: collecting the document is
 * registration work, and most MiniRoos families arrive with one. What a
 * registrar cannot do is *verify* it — that is the act that moves money, and
 * BR78 keeps it with an admin or treasurer.
 */
export async function attachVoucherAction(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const registrationId = String(formData.get('registrationId') ?? '');
  if (registrationId === '') throw new Error('Missing identifiers.');

  const program = String(formData.get('program') ?? '').trim();
  if (program === '') return 'Name the voucher program, e.g. Play On!.';

  const code = String(formData.get('code') ?? '').trim();
  if (code === '') return 'Enter the voucher code.';

  const value = parseAmountCents(String(formData.get('value') ?? ''));
  if (!value.ok) return value.error;
  if (value.cents <= 0) return 'A voucher must be worth something.';

  const raw = formData.get('file');
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (file !== null && file.type !== 'application/pdf') {
    return 'Attach the voucher as a PDF.';
  }
  if (file !== null && file.size > 5 * 1024 * 1024) {
    return 'That PDF is larger than 5 MB. Scan it at a lower resolution.';
  }

  const { client, user, tenant } = await requireTenant();
  const result = await attachVoucher(
    client,
    tenant.clubId,
    registrationId,
    { program, code, faceValueCents: value.cents, file },
    user.id,
  );
  if (!result.ok) return result.error;

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
  return null;
}

/**
 * Confirm a voucher is genuine, applying its value as a payment (BR81).
 *
 * Until this happens the family's balance is untouched, so BR3 fails and
 * BR79 keeps the player off the field — which is the point. A voucher that
 * turns out to be expired or already spent would otherwise have let a child
 * play on money the club never receives.
 */
export async function verifyVoucherAction(formData: FormData): Promise<void> {
  const voucherId = String(formData.get('voucherId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  if (voucherId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  const vouchers = await loadVouchers(client, tenant.clubId, registrationId);
  const voucher = vouchers.find((v) => v.id === voucherId);
  if (voucher === undefined) throw new Error('Voucher not found.');

  await verifyVoucher(client, tenant.clubId, voucher, user.id);

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}

/** Reject a voucher, reversing its relief if it had already been applied. */
export async function rejectVoucherAction(formData: FormData): Promise<void> {
  const voucherId = String(formData.get('voucherId') ?? '');
  const registrationId = String(formData.get('registrationId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  if (voucherId === '' || registrationId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();

  const vouchers = await loadVouchers(client, tenant.clubId, registrationId);
  const voucher = vouchers.find((v) => v.id === voucherId);
  if (voucher === undefined) throw new Error('Voucher not found.');

  await rejectVoucher(
    client,
    tenant.clubId,
    voucher,
    reason === '' ? 'No reason recorded.' : reason,
    user.id,
  );

  revalidatePath(`/registrar/${registrationId}`);
  revalidatePath('/registrar');
}
