'use server';

import { revalidatePath } from 'next/cache';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

import {
  appointMember,
  createTerm,
  enableVoucherProgram,
  recordResolution,
  resignMember,
} from '../../../data/governance.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { COMMITTEE_POSITIONS, type CommitteePosition } from '../../../domain/governance/term.ts';
import { parseDueDate } from '../../../web/plan-view.ts';
import { parseEnablement, parseResolution } from '../../../web/governance-view.ts';

function parsePosition(value: unknown): CommitteePosition | null {
  return typeof value === 'string' && (COMMITTEE_POSITIONS as readonly string[]).includes(value)
    ? (value as CommitteePosition)
    : null;
}

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

/**
 * Open a governance year.
 *
 * The next AGM date is asked for rather than computed. A year from the
 * start is the usual answer and not always the true one, and deriving it
 * would quietly assert that every club meets on time (BR86).
 */
export async function createTermAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const name = String(formData.get('name') ?? '').trim();
  if (name === '') return formFailed('Name the term, e.g. 2026–27.');

  const startsOn = parseDueDate(String(formData.get('startsOn') ?? ''));
  if (startsOn === null) return formFailed('Enter the start as a real calendar date.');

  const nextAgmDueOn = parseDueDate(String(formData.get('nextAgmDueOn') ?? ''));
  if (nextAgmDueOn === null) return formFailed('Enter when the next AGM is due, as a real calendar date.');
  if (nextAgmDueOn <= startsOn) return formFailed('The next AGM has to fall after the term starts.');

  const agmRaw = String(formData.get('agmHeldOn') ?? '').trim();
  const agmHeldOn = agmRaw === '' ? null : parseDueDate(agmRaw);
  if (agmRaw !== '' && agmHeldOn === null) {
    return formFailed('Enter the AGM date as a real calendar date, or leave it blank until the meeting happens.');
  }

  const { client, user, tenant } = await requireTenant();
  const result = await createTerm(
    client,
    tenant.clubId,
    { name, agmHeldOn, startsOn, nextAgmDueOn },
    user.id,
  );
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/governance');
  return formOk('Governance year opened.');
}

export async function appointMemberAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const termId = String(formData.get('termId') ?? '');
  if (termId === '') throw new Error('Missing identifiers.');

  const personId = String(formData.get('personId') ?? '');
  if (personId === '') return formFailed('Choose a person.');

  const position = parsePosition(formData.get('position'));
  if (position === null) return formFailed('Choose a position.');

  const electedRaw = String(formData.get('electedOn') ?? '').trim();
  const electedOn = electedRaw === '' ? null : parseDueDate(electedRaw);
  if (electedRaw !== '' && electedOn === null) {
    return formFailed('Enter the election date as a real calendar date.');
  }

  const { client, user, tenant } = await requireTenant();
  const result = await appointMember(
    client,
    tenant.clubId,
    termId,
    personId,
    position,
    electedOn,
    user.id,
  );
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/governance');
  return formOk('Committee member recorded.');
}

export async function resignMemberAction(formData: FormData): Promise<void> {
  const positionId = String(formData.get('positionId') ?? '');
  if (positionId === '') throw new Error('Missing identifiers.');

  const resignedOn =
    parseDueDate(String(formData.get('resignedOn') ?? '')) ??
    new Date().toISOString().slice(0, 10);

  const { client, user, tenant } = await requireTenant();
  await resignMember(client, tenant.clubId, positionId, resignedOn, user.id);

  revalidatePath('/registrar/governance');
}

/** BR123: record what the Committee decided. */
export async function recordResolutionAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseResolution({
    termId: String(formData.get('termId') ?? ''),
    decidedOn: String(formData.get('decidedOn') ?? ''),
    summary: String(formData.get('summary') ?? ''),
    movedByPersonId: String(formData.get('movedByPersonId') ?? ''),
    category: String(formData.get('category') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const { client, user, tenant } = await requireTenant();
  const result = await recordResolution(
    client,
    tenant.clubId,
    {
      termId: parsed.termId,
      decidedOn: parsed.decidedOn,
      summary: parsed.summary,
      movedByPersonId: parsed.movedByPersonId,
      category: parsed.category,
    },
    user.id,
  );
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/governance');
  return formOk('Resolution recorded.');
}

/** BR21: enable a Voucher Program the Committee has just approved. */
export async function enableVoucherProgramAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const parsed = parseEnablement({
    program: String(formData.get('program') ?? ''),
    resolutionId: String(formData.get('resolutionId') ?? ''),
  });
  if (!parsed.ok) return formFailed(parsed.error);

  const { client, user, tenant } = await requireTenant();
  const result = await enableVoucherProgram(
    client,
    tenant.clubId,
    { program: parsed.program, resolutionId: parsed.resolutionId },
    user.id,
  );
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/governance');
  return formOk(`${parsed.program} is now an enabled Voucher Program.`);
}
