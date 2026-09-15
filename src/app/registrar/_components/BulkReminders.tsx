'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { sendBulkRemindersAction } from '../actions.ts';
import { FormNotice } from './FormNotice.tsx';

/**
 * Chase everybody the queue says is blocked, from the queue (R34.1).
 *
 * **It does not say how many it will send.** The count on the button would
 * be computed when the page rendered and acted on when it was pressed, and
 * the action deliberately re-reads the queue in between — so a number here
 * would be a promise the action is right to break. What it says instead is
 * what it *will not* do, which is stable: nothing to families with nothing
 * outstanding, and nothing to anybody chased in the last week.
 *
 * The result lists everybody skipped, by name. A screen that sent to
 * eighteen of twenty-one and reported "18 sent" would be hiding the three
 * the registrar most needs to know about.
 */
export function BulkReminders({ seasonId }: { readonly seasonId: string }) {
  const [result, action, pending] = useActionState(sendBulkRemindersAction, IDLE_FORM);

  return (
    <form action={action} className="card">
      <h3 style={{ marginTop: 0 }}>Chase the families who are blocked</h3>
      <input type="hidden" name="seasonId" value={seasonId} />

      <p className="hint">
        One message per family, listing exactly what the rules say is outstanding for their child
        and nothing about anybody else&rsquo;s (BR127, BR131). It goes to every guardian holding
        authority, and honours anyone who has unsubscribed.
      </p>

      <p className="hint">
        <strong>Nobody with nothing outstanding is written to</strong>, and nobody chased in the
        last seven days is chased again. For the case where you mean it anyway, the reminder on a
        single registration is still there.
      </p>

      <FormNotice result={result} />

      <p style={{ marginBottom: 0 }}>
        <button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send the reminders'}
        </button>
      </p>
    </form>
  );
}
