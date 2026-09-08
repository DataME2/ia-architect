'use server';

import { revalidatePath } from 'next/cache';

import { createRequestClient } from '../../../data/server.ts';
import { formFailed, formOk, type FormResult } from '../../../web/form-result.ts';
import { isClubRole } from '../../../web/access-view.ts';

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
