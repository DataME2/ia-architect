'use client';

import { useActionState, useState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { withUtm } from '../../../web/utm.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { createPartnerAction, issueInvoiceAction, payPartnerAction, recordSponsorPaymentAction } from './actions.ts';

const COLLECTION_LABEL = { paypal: 'PayPal', google_pay: 'Google Pay', bank_transfer: 'Online bank transfer' } as const;

/** Invoice a campaign for a period (BR171). */
export function IssueInvoiceForm({ campaigns }: { readonly campaigns: readonly { readonly id: string; readonly label: string }[] }) {
  const [state, action, pending] = useActionState(issueInvoiceAction, IDLE_FORM);
  if (campaigns.length === 0) return <p className="hint" style={{ margin: 0 }}>No campaign to invoice yet.</p>;
  return (
    <form action={action} className="row" style={{ gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <label>
        Campaign{' '}
        <select name="campaignId">{campaigns.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
      </label>
      <label>From <input type="date" name="from" /></label>
      <label>To <input type="date" name="to" /></label>
      <button type="submit" disabled={pending}>{pending ? '…' : 'Issue invoice'}</button>
      <FormNotice result={state} />
    </form>
  );
}

/** Record the sponsor's payment: simulated (BR171). */
export function RecordPaymentForm({ invoiceId }: { readonly invoiceId: string }) {
  const [state, action, pending] = useActionState(recordSponsorPaymentAction, IDLE_FORM);
  return (
    <form action={action} className="row" style={{ gap: '0.4rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <label>
        Paid by{' '}
        <select name="method" defaultValue="bank_transfer">
          {(Object.keys(COLLECTION_LABEL) as (keyof typeof COLLECTION_LABEL)[]).map((m) => (
            <option key={m} value={m}>{COLLECTION_LABEL[m]}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="secondary" disabled={pending}>{pending ? '…' : 'Record payment (simulated)'}</button>
      <FormNotice result={state} />
    </form>
  );
}

/** A business that promotes the club, paid per completed registration (BR172). */
export function NewPartnerForm() {
  const [state, action, pending] = useActionState(createPartnerAction, IDLE_FORM);
  const [method, setMethod] = useState<'paypal' | 'bank_transfer'>('paypal');
  return (
    <form action={action} className="stack" style={{ gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>Business <input name="name" placeholder="Corner Café" /></label>
        <label>Campaign <input name="utmCampaign" placeholder="winter-2027" /></label>
        <label>Fee per completed registration ($) <input name="rate" inputMode="decimal" style={{ width: '6rem' }} /></label>
      </div>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>From <input type="date" name="startsOn" /></label>
        <label>Until <input type="date" name="endsOn" /></label>
        <label>
          Paid by{' '}
          <select name="method" value={method} onChange={(e) => setMethod(e.target.value as 'paypal' | 'bank_transfer')}>
            <option value="paypal">PayPal</option>
            <option value="bank_transfer">Bank account</option>
          </select>
        </label>
      </div>
      {method === 'paypal' ? (
        <label>PayPal email <input name="paypalEmail" type="email" /></label>
      ) : (
        <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
          <label>Name on the account <input name="accountName" /></label>
          <label>BSB <input name="bsb" inputMode="numeric" style={{ width: '6rem' }} /></label>
          <label>Account number <input name="accountNumber" inputMode="numeric" style={{ width: '9rem' }} /></label>
        </div>
      )}
      <FormNotice result={state} />
      <div><button type="submit" disabled={pending}>{pending ? '…' : 'Add partner'}</button></div>
    </form>
  );
}

/** The partner's link: the club's registration link plus the partner's UTM, as Google's builder writes it. */
export function PartnerLink({ source, medium, campaign }: { readonly source: string; readonly medium: string; readonly campaign: string }) {
  const [base, setBase] = useState('');
  let link = '';
  try {
    link = base.trim() === '' ? '' : withUtm(base.trim(), { source, medium, campaign });
  } catch {
    link = '';
  }
  return (
    <div className="stack" style={{ gap: '0.3rem' }}>
      <label>
        Club registration link{' '}
        <input value={base} onChange={(e) => setBase(e.target.value)} placeholder="Paste a link from Registration links" />
      </label>
      {link !== '' && (
        <output className="mono" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>{link}</output>
      )}
    </div>
  );
}

/** Pay a partner for a period: simulated (BR172). */
export function PayPartnerForm({ partnerId }: { readonly partnerId: string }) {
  const [state, action, pending] = useActionState(payPartnerAction, IDLE_FORM);
  return (
    <form action={action} className="row" style={{ gap: '0.4rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="hidden" name="partnerId" value={partnerId} />
      <label>From <input type="date" name="from" /></label>
      <label>To <input type="date" name="to" /></label>
      <button type="submit" className="secondary" disabled={pending}>{pending ? '…' : 'Pay partner (simulated)'}</button>
      <FormNotice result={state} />
    </form>
  );
}
