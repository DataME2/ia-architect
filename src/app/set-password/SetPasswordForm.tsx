'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { MINIMUM_LENGTH } from '../../web/password.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { setPasswordAction } from './actions.ts';

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <fieldset>
        <legend>Choose a password</legend>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={MINIMUM_LENGTH}
            required
          />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            At least {MINIMUM_LENGTH} characters. A few ordinary words together are easier to
            remember and harder to guess than something short with symbols in it.
          </p>
        </div>

        <div className="field">
          <label htmlFor="confirmation">Again</label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </form>
  );
}
