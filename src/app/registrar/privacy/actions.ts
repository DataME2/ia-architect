'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  decideErasure,
  disposePerson,
  recordErasureRequest,
  recordRetentionBasis,
  runRetentionReview,
  transferAuthority,
} from '../../../data/privacy.ts';
import { RETENTION_BASES } from '../../../domain/privacy/types.ts';
import type { RetentionBasisKind } from '../../../domain/privacy/types.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');
  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');
  return { client, user, tenant };
}

/** Record that a family asked (BR49). Answering it is a separate act. */
export async function recordRequestAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const personId = String(form.get('personId') ?? '').trim();
  if (personId === '') return formFailed('Whose record is the request about?');

  const { client, tenant } = await requireTenant();
  const error = await recordErasureRequest(
    client, tenant.clubId, personId, null, String(form.get('detail') ?? '').trim(),
  );

  revalidatePath('/registrar/privacy');
  return error === null
    ? formOk('Request recorded. Answer it below — it is not answered by being received.')
    : formFailed(error.replace(/^.*?:\s*/, ''));
}

/**
 * Answer it — honoured, or refused naming its bases (decision 13).
 *
 * The verdict is recomputed inside the database rather than posted from the
 * screen. A page rendered ten minutes ago may have been looking at a
 * retention basis that has since been recorded, and erasing a child because
 * a page was stale is not a mistake this system gets to make.
 */
export async function decideRequestAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const requestId = String(form.get('requestId') ?? '');
  if (requestId === '') return formFailed('Which request?');

  const { client } = await requireTenant();
  const result = await decideErasure(client, requestId);

  revalidatePath('/registrar/privacy');
  if ('error' in result) return formFailed(result.error);

  return formOk(result.outcome === 'honoured'
    ? 'Erased. The record and everything attached to it is gone; the request remains, naming nobody.'
    : 'Refused, with every binding reason recorded. Tell the family what it says.');
}

/** BR133: compute and propose. This button deletes nothing. */
export async function runReviewAction(_prev: FormResult, _form: FormData): Promise<FormResult> {
  const { client, tenant } = await requireTenant();
  const result = await runRetentionReview(client, tenant.clubId);

  revalidatePath('/registrar/privacy');
  return 'error' in result
    ? formFailed(result.error)
    : formOk(`Reviewed — ${result.count} record${result.count === 1 ? '' : 's'} assessed. Nothing has been deleted.`);
}

/** The human half of BR133, and the only thing here that destroys anything. */
export async function disposeAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const reviewId = String(form.get('reviewId') ?? '');
  if (reviewId === '') return formFailed('Which record?');

  const { client } = await requireTenant();
  const error = await disposePerson(client, reviewId);

  revalidatePath('/registrar/privacy');
  return error === null
    ? formOk('Disposed of. The record is gone and cannot be recovered.')
    : formFailed(error);
}

/** BR67 — authority ends at eighteen; contactability is untouched. */
export async function transferAuthorityAction(_prev: FormResult, _form: FormData): Promise<FormResult> {
  const { client, tenant } = await requireTenant();
  const result = await transferAuthority(client, tenant.clubId);

  revalidatePath('/registrar/privacy');
  if ('error' in result) return formFailed(result.error);
  return formOk(result.moved === 0
    ? 'Nothing to transfer — no guardian holds authority over someone who has turned eighteen.'
    : `${result.moved} young ${result.moved === 1 ? 'person' : 'people'} now hold their own rights. Their guardians remain contacts.`);
}

/** A reason a record must stay, so a refusal has something to name. */
export async function recordBasisAction(_prev: FormResult, form: FormData): Promise<FormResult> {
  const personId = String(form.get('personId') ?? '').trim();
  const basis = String(form.get('basis') ?? '') as RetentionBasisKind;
  const expiresOn = String(form.get('expiresOn') ?? '').trim();

  if (personId === '') return formFailed('Whose record does this apply to?');
  if (!RETENTION_BASES.includes(basis)) return formFailed('Which basis?');

  const { client, tenant } = await requireTenant();
  const error = await recordRetentionBasis(
    client, tenant.clubId, personId, basis,
    expiresOn === '' ? null : expiresOn,
    String(form.get('detail') ?? '').trim() || null,
  );

  revalidatePath('/registrar/privacy');
  return error === null
    ? formOk(expiresOn === ''
        ? 'Recorded, with no end date. This record can never be erased while it stands.'
        : `Recorded until ${expiresOn}.`)
    : formFailed(error.replace(/^.*?:\s*/, ''));
}
