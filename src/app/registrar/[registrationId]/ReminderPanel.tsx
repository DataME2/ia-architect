'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { sendReminderAction } from '../actions.ts';

/**
 * Tell the family what is outstanding (scope 36, WP4).
 *
 * The button says how many things the message will list, because a reminder
 * that lists nothing teaches a family that our messages are noise — and the
 * registrar should be able to see that before they send, not after.
 */
export function ReminderPanel({
  registrationId,
  seasonId,
  outstandingCount,
  guardianCount,
}: {
  readonly registrationId: string;
  readonly seasonId: string;
  readonly outstandingCount: number;
  readonly guardianCount: number;
}) {
  const [result, action, pending] = useActionState(sendReminderAction, IDLE_FORM);

  if (guardianCount === 0) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        No guardian with authority is recorded for this player, so there is nobody to remind.
      </p>
    );
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <FormNotice result={result} />

      <p className="hint" style={{ margin: 0 }}>
        {outstandingCount === 0
          ? 'Nothing is outstanding — the message will say the registration is complete.'
          : `The message lists the ${outstandingCount} thing${outstandingCount === 1 ? '' : 's'} still outstanding, in the same words shown above.`}
        {' '}Anyone who has asked not to be emailed will be skipped, and you will be told.
      </p>

      <button type="submit" disabled={pending}>
        {pending ? 'Sending…' : `Send a reminder to ${guardianCount === 1 ? 'the guardian' : 'both guardians'}`}
      </button>
    </form>
  );
}
