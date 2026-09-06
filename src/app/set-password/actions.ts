'use server';

import { redirect } from 'next/navigation';

import { createRequestClient, currentUser } from '../../data/server.ts';
import { formFailed, type FormResult } from '../../web/form-result.ts';
import { passwordProblem } from '../../web/password.ts';

/**
 * Choose a password, once, on first arrival.
 *
 * The order matters: the password is changed with Supabase first, and only
 * a success is recorded. Recording first would let a failed change mark
 * somebody as done and leave them with no password and no prompt — locked
 * out by the very step meant to prevent it.
 */
export async function setPasswordAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const password = String(formData.get('password') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in');

  const problem = passwordProblem(password, confirmation, user.email ?? '');
  if (problem !== null) return formFailed(problem);

  const { error } = await client.auth.updateUser({ password });
  if (error !== null) {
    return formFailed(
      error.message.includes('should be different')
        ? 'That is already your password. Choose a different one.'
        : error.message,
    );
  }

  await client.rpc('record_password_set');

  redirect('/registrar');
}
