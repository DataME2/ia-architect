'use client';

import { useActionState } from 'react';

import { checkInConsentText } from '../../../web/check-in.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { grantCheckInConsentAction, withdrawCheckInConsentAction } from '../check-in/actions.ts';

/**
 * BR185's agreement, in consent wording §5's words: shown to the guardian
 * for their child, and to a player of 18 about themselves.
 */
export function CheckInConsent({
  clubId,
  clubName,
  personId,
  playerName,
  self,
}: {
  readonly clubId: string;
  readonly clubName: string;
  readonly personId: string;
  readonly playerName: string;
  readonly self: boolean;
}) {
  const [state, formAction, pending] = useActionState(grantCheckInConsentAction, IDLE_FORM);
  const text = checkInConsentText({ club: clubName, player: playerName, self });
  return (
    <form action={formAction} className="stack ci-consent">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="personId" value={personId} />
      {text.paragraphs.map((p) => (
        <p key={p.slice(0, 24)} style={{ margin: 0 }}>
          {p}
        </p>
      ))}
      <label className="ci-agree">
        <input type="checkbox" name="agree" required />
        <span>{text.agree}</span>
      </label>
      <FormNotice result={state} />
      <p style={{ margin: 0 }}>
        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : 'Agree'}
        </button>
      </p>
    </form>
  );
}

/** Withdrawing stops new check-ins at once (BR185). */
export function WithdrawCheckIn({ clubId, personId }: { readonly clubId: string; readonly personId: string }) {
  const [state, formAction, pending] = useActionState(withdrawCheckInConsentAction, IDLE_FORM);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="personId" value={personId} />
      <FormNotice result={state} />
      <p style={{ margin: 0 }}>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Working…' : 'Withdraw the agreement'}
        </button>
      </p>
    </form>
  );
}
