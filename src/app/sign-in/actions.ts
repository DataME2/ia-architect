'use server';

import { redirect } from 'next/navigation';

import { createRequestClient } from '../../data/server.ts';
import { safeDestination } from '../../web/safe-destination.ts';

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
  const next = safeDestination(String(formData.get('next') ?? ''));

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

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const client = await createRequestClient();
  await client.auth.signOut();
  redirect('/sign-in');
}
