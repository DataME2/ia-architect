'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { issueInvitation, revokeInvitation } from '../../../data/invitations.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  DEFAULT_EXPIRY_DAYS,
  invitationLink,
  type IssueState,
} from '../../../web/invitation-view.ts';

async function requireTenant() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) throw new Error('Not signed in.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) throw new Error('This account is not a member of any club.');

  return { client, user, tenant };
}

export async function issueInvitationAction(
  _previous: IssueState,
  formData: FormData,
): Promise<IssueState> {
  const seasonId = String(formData.get('seasonId') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  const expiryDays = Number(formData.get('expiryDays') ?? DEFAULT_EXPIRY_DAYS);

  if (seasonId === '') return { link: null, label: null, error: 'Choose a season.' };
  if (label === '') {
    return { link: null, label: null, error: 'Give the link a name, so you can tell them apart later.' };
  }

  try {
    const { client, user, tenant } = await requireTenant();
    const issued = await issueInvitation(client, tenant.clubId, seasonId, label, expiryDays, user.id);

    // The request's own origin, so a preview deployment hands out preview
    // links rather than quietly sending families to production.
    const requestHeaders = await headers();
    const host = requestHeaders.get('host') ?? 'localhost:3000';
    const proto = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

    revalidatePath('/registrar/invitations');

    return {
      link: invitationLink(`${proto}://${host}`, issued.token),
      label: issued.row.label,
      error: null,
    };
  } catch (cause) {
    return {
      link: null,
      label: null,
      error: cause instanceof Error ? cause.message : 'The link could not be created.',
    };
  }
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  const invitationId = String(formData.get('invitationId') ?? '');
  if (invitationId === '') throw new Error('Missing invitation.');

  const { client, user, tenant } = await requireTenant();
  await revokeInvitation(client, tenant.clubId, invitationId, user.id);

  revalidatePath('/registrar/invitations');
}
