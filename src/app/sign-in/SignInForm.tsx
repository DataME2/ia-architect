'use client';

import { useActionState } from 'react';

import { signInAction } from './actions.ts';

export function SignInForm({ next }: { readonly next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, { error: null });

  return (
    <form action={formAction} className="stack">
      {state.error !== null && (
        <div className="errors">
          <strong>{state.error}</strong>
        </div>
      )}

      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
