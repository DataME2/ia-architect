'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { requestPasswordResetAction } from './actions.ts';

/**
 * The way back in, without going through the platform owner.
 *
 * Its absence was the same gap as the missing password: a club officer who
 * forgot theirs had no route except asking somebody to send another link by
 * hand, which is the support burden the whole invitation flow exists to
 * remove.
 *
 * The same form serves somebody who never had a password at all, which is
 * why the framing is a prop rather than fixed: on `/set-password` a person
 * has not *forgotten* anything, and a summary that says they have would send
 * them looking for a password that never existed.
 */
export function ResetForm({
  open = false,
  summary = 'Forgotten your password?',
}: {
  readonly open?: boolean;
  readonly summary?: string;
} = {}) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, IDLE_FORM);

  return (
    <details className="process-detail" style={{ marginTop: '1rem' }} open={open}>
      <summary>{summary}</summary>
      <form action={formAction} className="stack" style={{ marginTop: '0.75rem' }}>
        <FormNotice result={state} />
        <div className="field">
          <label htmlFor="resetEmail">Your email address</label>
          <input id="resetEmail" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <button type="submit" className="secondary" disabled={pending}>
            {pending ? 'Sending…' : 'Email me a link'}
          </button>
        </div>
      </form>
    </details>
  );
}
