'use server';

import { revalidatePath } from 'next/cache';

import {
  addClaimsToBatch, closeBatch, createBatch, decideClaim, loadClaimCandidates, notifyClaimDecision, raiseClaim,
  recordBatchPaid,
} from '../../../data/claims.ts';
import { loadRates, loadSchedules } from '../../../data/fees.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { previewClaim, parseDecision, canClose, canPay, type BatchSummary } from '../../../web/claim-view.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { standings } from '../../../web/fee-schedule-form.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Sign in first.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('No club.');
  return { client, user, tenant };
}

/**
 * Raise a claim (BR13, BR14, BR16, BR17, BR18).
 *
 * The rate is resolved **once, here**, against the schedule in force on
 * the fixture's own date — never at read time — because BR116 requires the
 * claim to carry the amount it was computed at. Re-reading the candidates
 * rather than trusting a hidden field posted from the form, for the same
 * reason the bulk-reminder and designation-answer actions both re-read
 * their own source of truth: what is claimed for must be true when the
 * claim is written, not when the page was rendered.
 */
export async function raiseClaimAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const appointmentId = String(formData.get('appointmentId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  if (appointmentId === '' || seasonId === '') return formFailed('Nothing to claim for.');

  const { client, user, tenant } = await requireTenant();

  const candidates = await loadClaimCandidates(client, tenant.clubId, seasonId);
  const candidate = candidates.find((c) => c.appointmentId === appointmentId);
  if (candidate === undefined) return formFailed('That appointment is no longer claimable.');

  const schedules = await loadSchedules(client, tenant.clubId);
  const inForce = standings(schedules, candidate.playedOn).find((s) => s.standing !== 'future');
  const rates = inForce === undefined ? [] : await loadRates(client, tenant.clubId, inForce.id);

  const preview = previewClaim(candidate, rates);
  if (preview.kind === 'blocked') return formFailed(`${preview.because} (${preview.rule})`);
  if (preview.kind === 'no-rate') {
    return formFailed('No rate matches this appointment — set one on the fee schedule first.');
  }
  if (preview.kind === 'ambiguous') {
    return formFailed('More than one rate matches this cell of the schedule — narrow one of them first.');
  }

  const error = await raiseClaim(
    client, tenant.clubId, appointmentId, preview.amountCents, inForce?.id ?? null, user.id,
  );

  revalidatePath('/registrar/referee-payments');
  return error === null ? formOk('Claim raised.') : formFailed(error);
}

/**
 * A treasurer's decision (open question #71: the treasurer decides, not
 * the coordinator who raised it).
 *
 * Approval is followed by `notifyClaimApproved`, wired for the first time
 * here — it has existed and gone uncalled since scope 36. The notice never
 * fails the decision: the record is the thing that had to happen, and an
 * official not emailed is a smaller problem than a decision that did not
 * save.
 */
export async function decideClaimAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const parsed = parseDecision({
    claimId: String(formData.get('claimId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const { client, user, tenant } = await requireTenant();

  const error = await decideClaim(client, tenant.clubId, parsed.claimId, parsed.approve, parsed.note, user.id);
  if (error !== null) return formFailed(error);

  revalidatePath('/registrar/referee-payments');

  if (!parsed.approve) return formOk('Rejected, with the reason recorded.');

  const notice = await notifyClaimDecision(client, tenant.clubId, tenant.clubName, parsed.claimId);
  return formOk(notice === null ? 'Approved.' : `Approved. ${notice}`);
}

export async function createBatchAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const reference = String(formData.get('reference') ?? '').trim();
  const { client, user, tenant } = await requireTenant();

  const result = await createBatch(client, tenant.clubId, reference === '' ? null : reference, user.id);
  revalidatePath('/registrar/referee-payments');
  return 'error' in result ? formFailed(result.error) : formOk('Batch created. Add approved claims to it below.');
}

export async function addToBatchAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const batchId = String(formData.get('batchId') ?? '');
  const claimIds = formData.getAll('claimId').map(String).filter((id) => id !== '');
  if (batchId === '') return formFailed('Which batch?');
  if (claimIds.length === 0) return formFailed('Choose at least one approved claim to add.');

  const { client, tenant } = await requireTenant();
  const error = await addClaimsToBatch(client, tenant.clubId, batchId, claimIds);
  revalidatePath('/registrar/referee-payments');
  return error === null
    ? formOk(`${claimIds.length} claim${claimIds.length === 1 ? '' : 's'} added.`)
    : formFailed(error);
}

export async function closeBatchAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const batchId = String(formData.get('batchId') ?? '');
  const summary: BatchSummary = {
    id: batchId,
    reference: null,
    totalCents: Number(formData.get('totalCents') ?? 0),
    claimCount: Number(formData.get('claimCount') ?? 0),
    closedAt: null,
    paidAt: null,
  };
  const check = canClose(summary);
  if (!check.allowed) return formFailed(check.reason ?? 'That batch cannot be closed.');

  const { client, user, tenant } = await requireTenant();
  const error = await closeBatch(client, tenant.clubId, batchId, user.id);
  revalidatePath('/registrar/referee-payments');
  return error === null ? formOk('Batch closed. Its total is now fixed.') : formFailed(error);
}

export async function payBatchAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const batchId = String(formData.get('batchId') ?? '');
  const paidReference = String(formData.get('paidReference') ?? '').trim();
  const closedAt = String(formData.get('closedAt') ?? '');
  const summary: BatchSummary = {
    id: batchId, reference: null, totalCents: 0, claimCount: 0,
    closedAt: closedAt === '' ? null : closedAt, paidAt: null,
  };
  const check = canPay(summary);
  if (!check.allowed) return formFailed(check.reason ?? 'That batch cannot be paid.');

  const { client, user, tenant } = await requireTenant();
  const error = await recordBatchPaid(client, tenant.clubId, batchId, paidReference === '' ? null : paidReference, user.id);
  revalidatePath('/registrar/referee-payments');
  return error === null ? formOk('Recorded as paid.') : formFailed(error);
}
