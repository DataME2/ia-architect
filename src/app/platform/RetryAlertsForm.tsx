'use client';

import { useActionState } from 'react';

import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { IDLE_FORM } from '../../web/form-result.ts';
import { retryAlertsAction } from './actions.ts';

/**
 * The retry, as a button somebody presses.
 *
 * BR147: nothing in this product runs on a schedule, and the tempting
 * alternative — retrying opportunistically when the next enquiry arrives —
 * fails in exactly the wrong place, because a quiet week is when a missed
 * lead matters most and a quiet week is when it would never fire.
 *
 * **The count is in the label**, not in a confirmation afterwards. This
 * button sends real email to a real inbox, and an operator should know how
 * many before they press it rather than after.
 */
export function RetryAlertsForm({ pending }: { readonly pending: number }) {
  const [state, formAction, running] = useActionState(retryAlertsAction, IDLE_FORM);

  return (
    <form action={formAction} style={{ marginTop: '0.6rem' }}>
      <FormNotice result={state} />
      <button type="submit" disabled={running}>
        {running
          ? 'Trying again…'
          : pending === 1
            ? 'Try that alert again'
            : `Try those ${pending} alerts again`}
      </button>
    </form>
  );
}
