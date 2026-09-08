'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createRequestClient } from '../../data/server.ts';
import { formOk, type FormResult } from '../../web/form-result.ts';
import { landingFor } from '../../web/safe-destination.ts';

// Only the type lives here. A 'use server' module may export nothing but
// async functions -- types are erased, so they are fine; a const object is
// not, and the initial state is inlined at its single use site instead.
export interface SignInState {
  readonly error: string | null;
}

/**
 * Email and password sign-in for club staff.
 *
 * Deliberately plain. The session cookie this sets is what every RLS policy
 * keys off through `auth.uid()`, so this is the point where a request stops
 * being anonymous and starts being scoped to one club.
 */
export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const requested = String(formData.get('next') ?? '');

  if (email === '' || password === '') {
    return { error: 'Enter your email address and password.' };
  }

  const client = await createRequestClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error !== null) {
    // Not echoed verbatim: the provider distinguishes "no such user" from
    // "wrong password", and repeating that tells an attacker which club
    // emails are real.
    return { error: 'That email address and password did not match.' };
  }

  // Turn any access recorded against this address into a real membership.
  // Somebody provisioned as a club's responsible person may arrive by
  // password rather than by the emailed link — a second visit, a saved
  // password, a different device — and their access should not depend on
  // which door they used.
  await client.rpc('claim_club_access');

  // The platform identity holds no membership by design, so the club queue
  // would greet the operator with "this account belongs to no club" — true,
  // and indistinguishable from something being broken. Asked of the
  // database rather than matched against an email address here: the
  // allowlist is the control, and an address in application code would be a
  // second, weaker one that could disagree with it.
  const { data: isPlatform } = await client.rpc('app_is_platform');

  redirect(landingFor(requested, isPlatform === true));
}

export async function signOutAction(): Promise<void> {
  const client = await createRequestClient();
  await client.auth.signOut();
  redirect('/sign-in');
}

/**
 * Email a link to somebody who has forgotten their password.
 *
 * **The answer is the same whether or not the address has an account.**
 * Telling a caller which club emails are real is the same disclosure the
 * sign-in error already refuses to make, and this form is unauthenticated,
 * so it would be a directory anybody could query.
 */
export async function requestPasswordResetAction(
  _previous: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const said = 'If that address has an account, a link is on its way. It is good for one use.';

  if (email === '' || !email.includes('@')) return formOk(said);

  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? 'localhost:3000';
  const proto =
    requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');

  const client = await createRequestClient();
  // The error is deliberately not surfaced, for the reason above.
  await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/auth/callback?next=%2Fset-password`,
  });

  return formOk(said);
}
