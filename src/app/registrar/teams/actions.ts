'use server';

import { revalidatePath } from 'next/cache';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';

import {
  addTeamMember,
  createTeam,
  recordClearance,
  removeTeamMember,
} from '../../../data/teams.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { parseDueDate } from '../../../web/plan-view.ts';
import { parseTeamRole } from '../../../web/team-view.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

export async function createTeamAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') throw new Error('Missing identifiers.');

  const name = String(formData.get('name') ?? '').trim().replace(/\s+/g, ' ');
  if (name === '') return formFailed('Give the team a name.');

  const ageGroup = String(formData.get('ageGroup') ?? '').trim();

  const { client, user, tenant } = await requireTenant();
  try {
    await createTeam(client, tenant.clubId, seasonId, name, ageGroup === '' ? null : ageGroup, user.id);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Unknown error';
    return formFailed(
      detail.includes('team_club_id_season_id_name_key')
        ? `This season already has a team called ${name}.`
        : detail,
    );
  }

  revalidatePath('/registrar/teams');
  return formOk('Team created.');
}

/**
 * Add someone to a team.
 *
 * An uncleared official is refused by the database (BR83), and the message
 * that comes back is turned into something a registrar can act on rather
 * than a constraint name.
 */
export async function addMemberAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const teamId = String(formData.get('teamId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const role = parseTeamRole(formData.get('role'));

  if (teamId === '') throw new Error('Missing identifiers.');
  if (personId === '') return formFailed('Choose a person.');
  if (role === null) return formFailed('Choose a role.');

  const { client, user, tenant } = await requireTenant();
  const result = await addTeamMember(client, tenant.clubId, teamId, personId, role, user.id);
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/teams');
  return formOk(`${role === 'player' ? 'Player' : 'Official'} added to the team.`);
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const memberId = String(formData.get('memberId') ?? '');
  if (memberId === '') throw new Error('Missing identifiers.');

  const { client, user, tenant } = await requireTenant();
  await removeTeamMember(client, tenant.clubId, memberId, user.id);

  revalidatePath('/registrar/teams');
}

/**
 * Record a Working with Children Check.
 *
 * "Verified" is a separate tick from the card number, and it means a human
 * looked the number up on the state's portal. BR19 is not satisfied by
 * holding a number, and collapsing the two would let a typed digit clear a
 * coach.
 */
export async function recordClearanceAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  if (personId === '') return formFailed('Choose a person.');

  const identifier = String(formData.get('identifier') ?? '').trim();
  if (identifier === '') return formFailed('Enter the card number.');

  const kind = String(formData.get('kind') ?? '').trim() || 'WWCC';

  const expiresOn = parseDueDate(String(formData.get('expiresOn') ?? ''));
  if (expiresOn === null) return formFailed('Enter the expiry as a real calendar date.');

  const issuedRaw = String(formData.get('issuedOn') ?? '').trim();
  const issuedOn = issuedRaw === '' ? null : parseDueDate(issuedRaw);
  if (issuedRaw !== '' && issuedOn === null) return formFailed('Enter the issue date as a real calendar date.');
  if (issuedOn !== null && issuedOn > expiresOn) {
    return formFailed('The card cannot expire before it was issued.');
  }

  const verified = formData.get('verified') === 'on';

  // The scan. Optional: a club chasing a card number should not be blocked
  // from recording it because the photograph arrives tomorrow.
  const raw = formData.get('file');
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (file !== null && !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
    return formFailed('Attach the card as a PDF, JPEG or PNG.');
  }
  if (file !== null && file.size > 5 * 1024 * 1024) {
    return formFailed('That file is larger than 5 MB. Photograph it at a lower resolution.');
  }

  const { client, user, tenant } = await requireTenant();
  const result = await recordClearance(
    client,
    tenant.clubId,
    personId,
    { kind, identifier, issuedOn, expiresOn, verified, file },
    user.id,
  );
  if (!result.ok) return formFailed(result.error);

  revalidatePath('/registrar/teams');
  revalidatePath('/registrar/people');
  return formOk(
    verified
      ? `Clearance recorded and verified against the portal, covering to ${expiresOn}.`
      : 'Clearance recorded, but NOT verified. Until somebody checks this number against the state portal it clears nobody, and they still cannot be added as an official (BR19).',
  );
}
