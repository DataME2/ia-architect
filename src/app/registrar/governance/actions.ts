'use server';

import { revalidatePath } from 'next/cache';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

import {
  appointMember,
  createTerm,
  editPosition,
  enableVoucherProgram,
  recordResolution,
  resignMember,
  confirmPosition,
} from '../../../data/governance.ts';
import { appointFunction, confirmAppointmentAccess, endFunction } from '../../../data/appointments.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { COMMITTEE_POSITIONS, type CommitteePosition } from '../../../domain/governance/term.ts';
import { accessLabel } from '../../../web/access-view.ts';
import { FUNCTION_LABEL, isFunctionKind } from '../../../web/appointment-view.ts';
import { parseDueDate } from '../../../web/plan-view.ts';
import { parseEnablement, parseResolution } from '../../../web/governance-view.ts';
import { todayIn } from '../../../web/today.ts';
import { testAddressNote } from '../../../web/test-address.ts';
import { sendWorkspaceMagicLink } from '../actions.ts';

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
  revalidatePath('/me');
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
  revalidatePath('/me');
  return formOk('Committee member recorded.');
}

/** Correct a typo in a recorded position or election date — see `editPosition`. */
export async function editMemberAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const positionId = String(formData.get('positionId') ?? '');
  if (positionId === '') return formFailed('Nothing to correct.');

  const position = parsePosition(formData.get('position'));
  if (position === null) return formFailed('Choose a position.');

  const electedRaw = String(formData.get('electedOn') ?? '').trim();
  const electedOn = electedRaw === '' ? null : parseDueDate(electedRaw);
  if (electedRaw !== '' && electedOn === null) {
    return formFailed('Enter the election date as a real calendar date.');
  }

  const { client, user, tenant } = await requireTenant();
  const result = await editPosition(client, tenant.clubId, positionId, position, electedOn, user.id);
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/governance');
  revalidatePath('/me');
  return formOk('Corrected.');
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
  revalidatePath('/me');
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
  revalidatePath('/me');
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
  revalidatePath('/me');
  return formOk(`${parsed.program} is now an enabled Voucher Program.`);
}

/** A QueryError reads "table: what the database said"; an admin needs the second half. */
function databaseSaid(error: unknown): string {
  return error instanceof Error ? error.message.replace(/^.*?:\s*/, '') : 'Something went wrong.';
}

/** Appoint somebody to a club function — IT Manager, Blue Card Administrator, … (scope 68). */
export async function appointFunctionAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  const kind = String(formData.get('kind') ?? '');
  if (personId === '') return formFailed('Choose who is being appointed.');
  if (!isFunctionKind(kind)) return formFailed('Choose a function.');

  const startsRaw = String(formData.get('startsOn') ?? '').trim();
  const startsOn = startsRaw === '' ? todayIn() : parseDueDate(startsRaw);
  if (startsOn === null) return formFailed('Enter the start as a real calendar date.');

  const { client, tenant } = await requireTenant();
  try {
    await appointFunction(client, tenant.clubId, personId, kind, startsOn);
  } catch (error) {
    return formFailed(databaseSaid(error));
  }

  revalidatePath('/registrar/governance');
  revalidatePath('/me');
  return formOk(`Appointed as ${FUNCTION_LABEL[kind]}. Confirm their access when you are ready.`);
}

/**
 * End a club function today. BR154: the access it carried is kept — an
 * admin removes it on the Access screen, which flags it from now on.
 */
export async function endFunctionAction(formData: FormData): Promise<void> {
  const appointmentId = String(formData.get('appointmentId') ?? '');
  if (appointmentId === '') throw new Error('Nothing to end.');

  const { client, tenant } = await requireTenant();
  await endFunction(client, tenant.clubId, appointmentId, todayIn());
  revalidatePath('/registrar/governance');
  revalidatePath('/me');
  revalidatePath('/registrar/access');
}

/**
 * BR153: confirm the access an office or function carries. A linked
 * account gets it at once; anybody else is sent a sign-in link and gets
 * it on arrival, already linked to the Person named here.
 */
export async function confirmAccessAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const positionId = String(formData.get('positionId') ?? '');
  const functionId = String(formData.get('functionId') ?? '');
  if ((positionId === '') === (functionId === '')) return formFailed('Nothing to confirm.');

  const { client } = await requireTenant();
  let outcome;
  try {
    outcome = await confirmAppointmentAccess(
      client,
      positionId !== '' ? { positionId } : { functionId },
    );
  } catch (error) {
    return formFailed(databaseSaid(error));
  }

  revalidatePath('/registrar/governance');
  revalidatePath('/me');
  revalidatePath('/registrar/access');

  if (outcome.kind === 'granted') {
    return formOk(`Access granted now: ${accessLabel(outcome.accessRole)}. Their account was already linked.`);
  }

  const sendError = await sendWorkspaceMagicLink(outcome.email);
  if (sendError !== null) {
    return formFailed(
      `Recorded, but the email did not send: ${sendError}. Press the button again to resend.`,
    );
  }
  const note = testAddressNote(outcome.email);
  if (note !== null) return formOk(note);
  return formOk(
    `Link sent to ${outcome.email}. When they open it and set a password they arrive with `
      + `${accessLabel(outcome.accessRole)} access, already linked to their record.`,
  );
}

/** One executive confirmation of a committee position (BR167); the database decides whose. */
export async function confirmPositionAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  const positionId = String(formData.get('positionId') ?? '');
  if (positionId === '') return formFailed('Which position?');
  const { client } = await requireTenant();
  const result = await confirmPosition(client, positionId);
  revalidatePath('/registrar/governance');
  revalidatePath('/me');
  return result.ok ? formOk('Confirmed. The committee has been told.') : formFailed(result.error);
}
