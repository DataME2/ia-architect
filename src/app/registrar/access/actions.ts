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
