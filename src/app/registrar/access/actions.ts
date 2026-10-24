'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { testAddressNote } from '../../../web/test-address.ts';

import { ConfigError } from '../../../data/env.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { createSignInLink } from '../../../data/sign-in-link.ts';
import { welcomeLink, type ShareLinkResult } from '../../../web/sign-in-link.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { isClubRole } from '../../../web/access-view.ts';
import { sendWorkspaceMagicLink } from '../actions.ts';

/**
 * Grant somebody a role at this club.
 *
 * The club is not an argument — `grant_club_role` derives it from the
 * caller's own admin membership — so there is no version of this request
 * that grants access at a club the caller does not administer.
 */
export async function grantAccessAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? '');

  if (email === '' || !email.includes('@')) {
    return formFailed('Enter the email address of an existing account.');
  }
  if (!isClubRole(role)) return formFailed('Choose a role.');

  const client = await createRequestClient();
  const { error } = await client.rpc('grant_club_role', { p_email: email, p_role: role });

  if (error !== null) {
    // The "no such account" case is the one an admin will actually hit, and
    // it needs saying rather than becoming "something went wrong".
    return formFailed(
      error.message.includes('No account exists')
        ? `No account exists for ${email}. They need to create one first — then this will work.`
        : error.message.replace(/^.*?:\s*/, ''),
    );
  }

  revalidatePath('/registrar/access');
  return formOk(`${email} can now act as ${role} at this club.`);
}

export async function revokeAccessAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '');
  const email = String(formData.get('email') ?? '');

  if (userId === '' || !isClubRole(role)) return formFailed('Nothing to revoke.');

  const client = await createRequestClient();
  const { error } = await client.rpc('revoke_club_role', { p_user_id: userId, p_role: role });

  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  revalidatePath('/registrar/access');
  return formOk(`${email || 'That account'} is no longer ${role} at this club.`);
}

/**
 * Record that an account belongs to a Person.
 *
 * The club is not an argument — `link_account_to_person` derives it from
 * the caller's own admin membership. Neither is the *assertion*: this is a
 * person saying so, which is the whole of decision 10. Nothing here reads
 * an email address and guesses.
 */
export async function linkAccountAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const userId = String(formData.get('userId') ?? '');
  const personId = String(formData.get('personId') ?? '');
  const email = String(formData.get('email') ?? '');

  if (userId === '') return formFailed('Nothing to link.');
  if (personId === '') return formFailed('Choose who this account belongs to.');

  const client = await createRequestClient();
  const { error } = await client.rpc('link_account_to_person', {
    p_user_id: userId,
    p_person_id: personId,
  });

  if (error !== null) {
    // The reverse-direction collision is the one an admin will actually
    // hit — two people at a club share a name and the wrong one gets
    // picked — and "duplicate key value violates unique constraint" is
    // not something a club secretary can act on.
    return formFailed(
      /duplicate key|unique constraint/i.test(error.message)
        ? 'Somebody else’s account is already recorded as that person. Unlink that one first.'
        : error.message.replace(/^.*?:\s*/, ''),
    );
  }

  revalidatePath('/registrar/access');
  return formOk(`${email || 'That account'} is now recorded as that person.`);
}

/** Remove the link, and nothing else — not the Person, not the access (BR108). */
export async function unlinkAccountAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const userId = String(formData.get('userId') ?? '');
  const email = String(formData.get('email') ?? '');
  if (userId === '') return formFailed('Nothing to unlink.');

  const client = await createRequestClient();
  const { error } = await client.rpc('unlink_account', { p_user_id: userId });
  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  revalidatePath('/registrar/access');
  return formOk(
    `${email || 'That account'} is no longer recorded as anybody. They keep their access.`,
  );
}

/**
 * Restore a workspace whose login link was removed (0061): clear the claim
 * on this Person's invitation and send a new link. On arrival the family or
 * player claim links the login to this Person again. The database refuses
 * when the link is still in place, so this cannot detach a working one.
 */
export async function reissueWorkspaceAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const personId = String(formData.get('personId') ?? '');
  if (personId === '') return formFailed('Nothing to resend.');

  const client = await createRequestClient();
  const { data, error } = await client.rpc('reissue_workspace_invitation', { p_person_id: personId });
  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));

  const email = String(data ?? '');
  const sendError = await sendWorkspaceMagicLink(email);
  revalidatePath('/registrar/access');
  if (sendError !== null) {
    return formFailed(`The invitation is reset, but the email did not send: ${sendError}. Press again to retry.`);
  }
  return formOk(testAddressNote(email) ?? `New link sent to ${email}. When they open it, their workspace is back.`);
}

/**
 * The person's own sign-in link, for an administrator to send by any
 * channel (BR180, scope 109).
 *
 * `reissue_workspace_invitation` is the gate, exactly as for Resend: an
 * administrator or registrar of the person's club, an invitation not in
 * use, re-addressed to the current email, audited. Then the link, only for
 * an account nobody has used and no other club is waiting for. A link that
 * cannot be recorded is not shown.
 */
export async function workspaceLinkAction(
  _previous: ShareLinkResult,
  formData: FormData,
): Promise<ShareLinkResult> {
  const personId = String(formData.get('personId') ?? '');
  if (personId === '') return formFailed('Nobody to make a link for.');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return formFailed('Not signed in.');

  const { data, error } = await client.rpc('reissue_workspace_invitation', { p_person_id: personId });
  if (error !== null) return formFailed(error.message.replace(/^.*?:\s*/, ''));
  const email = String(data ?? '');

  const { data: person } = await client.from('person').select('club_id').eq('id', personId).single();
  if (person === null) return formFailed('No such person.');

  let made;
  try {
    made = await createSignInLink(String(person.club_id), email);
  } catch (e) {
    if (!(e instanceof ConfigError)) throw e;
    return formFailed('This server has no SUPABASE_SERVICE_ROLE_KEY, so it cannot make a link. Resend link still works.');
  }
  if (!made.ok) return formFailed(made.message);

  const { error: auditError } = await client.from('audit_event').insert({
    club_id: person.club_id,
    action: 'workspace.link-created',
    entity: 'person',
    entity_id: personId,
    actor_user_id: user.id,
    detail: { email },
  });
  if (auditError !== null) return formFailed('The link could not be recorded, so it is not shown. Try again.');

  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? 'localhost:3000';
  const proto = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  revalidatePath('/registrar/access');
  return { status: 'link', link: welcomeLink(`${proto}://${host}`, made.tokenHash, made.type), email };
}
