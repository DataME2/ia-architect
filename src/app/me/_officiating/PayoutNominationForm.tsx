'use client';

import { useActionState, useState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { PAYOUT_METHOD_LABEL, type PayoutMethod } from '../../../web/payout-nomination.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { nominatePayoutAction } from './actions.ts';

/**
 * "Where should the club pay you?" — BR161. One live nomination per
 * official; saving a new one replaces it. Shown masked once saved: the
 * whole number never comes back to the screen.
 */
export function PayoutNominationForm({
  clubId,
  personId,
  officialName,
  current,
}: {
  readonly clubId: string;
  readonly personId: string;
  readonly officialName: string;
  /** The live nomination, masked, or null. */
  readonly current: string | null;
}) {
  const [state, formAction, pending] = useActionState(nominatePayoutAction, IDLE_FORM);
  const [method, setMethod] = useState<PayoutMethod>('bank_transfer');
  const id = (f: string) => `${f}-${personId}`;

  return (
    <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="personId" value={personId} />
      <p style={{ margin: 0 }}>
        <b>Where {officialName} is paid:</b> {current ?? 'not nominated yet.'}
      </p>
      <FormNotice result={state} />
      <p style={{ margin: 0 }}>
        <label htmlFor={id('method')}>{current === null ? 'Nominate' : 'Change to'}</label>{' '}
        <select id={id('method')} name="method" value={method} onChange={(e) => setMethod(e.target.value as PayoutMethod)}>
          {(Object.keys(PAYOUT_METHOD_LABEL) as PayoutMethod[]).map((m) => (
            <option key={m} value={m}>{PAYOUT_METHOD_LABEL[m]}</option>
          ))}
        </select>
      </p>
      {method === 'bank_transfer' && (
        <p className="row" style={{ margin: 0, gap: '0.5rem', flexWrap: 'wrap' }}>
          <label>Name on the account <input name="accountName" autoComplete="name" /></label>
          <label>BSB <input name="bsb" inputMode="numeric" style={{ width: '6rem' }} /></label>
          <label>Account number <input name="accountNumber" inputMode="numeric" style={{ width: '9rem' }} /></label>
        </p>
      )}
      {method === 'paypal' && (
        <p style={{ margin: 0 }}>
          <label>PayPal email <input name="paypalEmail" type="email" autoComplete="email" /></label>
        </p>
      )}
      {method === 'stripe' && (
        <p style={{ margin: 0 }}>
          <label>Stripe account id <input name="stripeAccountId" placeholder="acct_…" /></label>
        </p>
      )}
      <div>
        <button type="submit" disabled={pending}>{pending ? '…' : 'Save where to be paid'}</button>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Read only by you and the club&rsquo;s treasurer. Online payment is a <b>simulation</b> for now: no money
        moves until the club connects a payment provider.{' '}
        <span className="mono" style={{ fontSize: '0.7rem' }}>BR161 · BR162</span>
      </p>
    </form>
  );
}
