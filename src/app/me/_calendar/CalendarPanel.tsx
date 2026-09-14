'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { revokeCalendarAction, subscribeCalendarAction } from './actions.ts';

/**
 * The calendar feed, from the person's own side (BR30–BR34).
 *
 * The URL appears once, in the result of subscribing, and is never
 * redisplayed — it is a bearer credential, and anyone holding it can read
 * where this person will be. Rotation is offered rather than "show me the
 * link again", exactly as a registration invitation offers reissue (BR73).
 */
export function CalendarPanel({
  clubId,
  personId,
  subscriptionId,
  subscribed,
  rotatedAt,
}: {
  readonly clubId: string;
  readonly personId: string;
  readonly subscriptionId: string | null;
  readonly subscribed: boolean;
  readonly rotatedAt: string | null;
}) {
  const [result, action, pending] = useActionState(subscribeCalendarAction, IDLE_FORM);
  const [revokeResult, revoke, revoking] = useActionState(revokeCalendarAction, IDLE_FORM);

  return (
    <div className="stack">
      <p className="hint" style={{ margin: 0 }}>
        Your appointments in the calendar you already use. Your calendar fetches them on its own
        schedule, so a change can take a few hours to appear &mdash; the club&rsquo;s own record is
        always the one that counts.
      </p>

      <form action={action}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="personId" value={personId} />
        <FormNotice result={result} />
        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : subscribed ? 'Rotate the link' : 'Subscribe'}
        </button>
        {subscribed && (
          <p className="hint" style={{ margin: 'var(--space-1) 0 0' }}>
            Rotating gives you a new link and stops the old one working. There is no way to see the
            current link again &mdash; anyone holding it can read where you will be, so it is shown
            once.
            {rotatedAt !== null && <> Last rotated {rotatedAt.slice(0, 10)}.</>}
          </p>
        )}
      </form>

      {subscribed && subscriptionId !== null && (
        <form action={revoke}>
          <input type="hidden" name="subscriptionId" value={subscriptionId} />
          <FormNotice result={revokeResult} />
          <button type="submit" disabled={revoking}>
            {revoking ? 'Revoking…' : 'Revoke it entirely'}
          </button>
        </form>
      )}
    </div>
  );
}
