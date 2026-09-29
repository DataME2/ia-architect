'use server';

import { revalidatePath } from 'next/cache';

import { loadTenantContext, setSeasonRole } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { savePersonEdit } from '../../../data/person-edit.ts';
import { inviteWorkspaces } from '../../../data/workspace-invitations.ts';
import { parsePersonEdit } from '../../../web/person-edit.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { parseSeasonRole } from '../../../web/people-view.ts';
import { todayIn } from '../../../web/today.ts';
import { sendWorkspaceMagicLink } from '../actions.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');
  return { client, user, tenant };
}

/**
 * Grant or revoke one season role (P1).
 *
 * The club is re-derived from the session, never read from the form. A
 * `club_id` posted by a browser is an assertion by whoever is on the other
 * end of it; the membership row is the fact — and the policy on
 * `person_role` is what actually enforces it either way.
 *
 * Granting `player` also sends the workspace links that season now calls
 * for, if the registration is already COMPLETE (scope 68 WP2) — nobody has
 * to go and press Invite afterwards.
 */
export async function setRoleAction(formData: FormData): Promise<void> {
  const personId = String(formData.get('personId') ?? '');
  const seasonId = String(formData.get('seasonId') ?? '');
  const role = parseSeasonRole(formData.get('role'));
  const granted = formData.get('granted') === '1';

  if (personId === '' || seasonId === '') throw new Error('Missing identifiers.');
  if (role === null) throw new Error('That is not a season role.');

  const { client, user, tenant } = await requireTenant();

  await setSeasonRole(client, tenant.clubId, personId, seasonId, role, granted, user.id);

  if (granted && role === 'player') {
    const outcome = await inviteWorkspaces(client, tenant.clubId, seasonId, user.id, todayIn(), personId);
    // Best-effort: a failed send is recoverable from the registration's
    // own invite panel, and this form has nowhere to report it.
    for (const email of outcome.toSend) await sendWorkspaceMagicLink(email);
  }

  revalidatePath('/registrar/people');
}

/**
 * Send every workspace link this season is missing — for players marked
 * before scope 68 WP2 existed. One deliberate press rather than a surprise
 * email to every family on deployment, which is the club's choice.
 */
export async function inviteAllMissingAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') return formFailed('No season chosen.');

  const { client, user, tenant } = await requireTenant();
  if (!tenant.roles.some((r) => r === 'admin' || r === 'registrar')) {
    return formFailed('Only an administrator or registrar sends workspace links.');
  }

  const outcome = await inviteWorkspaces(client, tenant.clubId, seasonId, user.id, todayIn());

  const failedSends: string[] = [];
  for (const email of outcome.toSend) {
    if ((await sendWorkspaceMagicLink(email)) !== null) failedSends.push(email);
  }

  revalidatePath('/registrar/people');

  const sent = outcome.toSend.length - failedSends.length;
  const parts = [sent === 0 ? 'Nobody was missing a link.' : `Sent ${sent} workspace link${sent === 1 ? '' : 's'}.`];
  if (outcome.missingEmail.length > 0) {
    parts.push(`No email on record, so no link: ${outcome.missingEmail.join('; ')}.`);
  }
  if (outcome.noGuardian.length > 0) {
    parts.push(`No guardian with authority recorded for: ${outcome.noGuardian.join(', ')}.`);
  }
  if (failedSends.length > 0) {
    parts.push(
      `Recorded, but the email did not send to: ${failedSends.join(', ')}. `
        + 'Resend from that player’s registration page.',
    );
  }
  if (outcome.errors.length > 0) parts.push(`Refused: ${outcome.errors.join('; ')}.`);

  const message = parts.join(' ');
  return failedSends.length > 0 || outcome.errors.length > 0 ? formFailed(message) : formOk(message);
}

/**
 * Correct a Person's names, email or date of birth (scope 68). A changed
 * legal name loses its verification (BR55) and the screen says so, because
 * the next person to look needs to check the document again.
 */
export async function editPersonAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  if (personId === '') return formFailed('Nothing to edit.');

  const parsed = parsePersonEdit(
    {
      legalGivenNames: String(formData.get('legalGivenNames') ?? ''),
      legalFamilyName: String(formData.get('legalFamilyName') ?? ''),
      preferredName: String(formData.get('preferredName') ?? ''),
      email: String(formData.get('email') ?? ''),
      dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
    },
    todayIn(),
  );
  if (!parsed.ok) return formFailed(parsed.message);

  const { client, user, tenant } = await requireTenant();
  let saved;
  try {
    saved = await savePersonEdit(client, tenant.clubId, personId, parsed.value, user.id);
  } catch (error) {
    return formFailed(error instanceof Error ? error.message.replace(/^.*?:\s*/, '') : 'Could not save.');
  }

  revalidatePath('/registrar/people');
  if (saved.changed.length === 0) return formOk('Nothing had changed.');
  return formOk(
    `Saved.${saved.verificationWithdrawn
      ? ' The legal name changed, so it now needs checking against their document again (BR55).'
      : ''}`,
  );
}
