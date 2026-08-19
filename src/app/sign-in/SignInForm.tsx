'use client';

import { useActionState } from 'react';

import { EMPTY_SIGN_IN_STATE, signInAction } from './actions.ts';

export function SignInForm({ next }: { readonly next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, EMPTY_SIGN_IN_STATE);

  return (
    <form action={formAction} className="stack">
      {state.error !== null && (
        <div className="errors">
          <strong>{state.error}</strong>
        </div>
      )}

      <fieldset>
        <legend>Sign in</legend>
        <input type="hidden" name="next" value={next} />

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  );
}
