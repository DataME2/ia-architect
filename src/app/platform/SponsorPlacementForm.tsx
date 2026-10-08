'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { MODEL_LABEL, type PricingModel } from '../../web/sponsor-billing.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { placeCampaignAction } from './actions.ts';

/** Place a platform campaign into one opted-in club (scope 84, BR170). */
export function SponsorPlacementForm({ clubs }: { readonly clubs: readonly { readonly id: string; readonly name: string; readonly sharePct: number }[] }) {
  const [state, action, pending] = useActionState(placeCampaignAction, IDLE_FORM);
  if (clubs.length === 0) {
    return <p className="hint" style={{ margin: 0 }}>No club has opted in to platform campaigns yet.</p>;
  }
  return (
    <form action={action} className="stack" style={{ gap: '0.5rem' }}>
      <label>
        Club{' '}
        <select name="clubId" defaultValue={clubs[0]!.id}>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} (club share {c.sharePct}%)</option>)}
        </select>
      </label>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>Sponsor <input name="sponsorName" /></label>
        <label>Link <input name="linkUrl" placeholder="https://…" /></label>
      </div>
      <label>Headline (90) <input name="headline" maxLength={90} /></label>
      <label>Text (optional, 200) <input name="body" maxLength={200} /></label>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>
          Model{' '}
          <select name="pricingModel" defaultValue="cpm">
            {(Object.keys(MODEL_LABEL) as PricingModel[]).map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
          </select>
        </label>
        <label>Rate ($) <input name="rate" inputMode="decimal" style={{ width: '6rem' }} /></label>
        <label>From <input type="date" name="startsOn" /></label>
        <label>Until <input type="date" name="endsOn" /></label>
      </div>
      {['guardian', 'coach', 'referee', 'player', 'committee'].map((a) => (
        <input key={a} type="hidden" name="audience" value={a} />
      ))}
      <FormNotice result={state} />
      <div><button type="submit" disabled={pending}>{pending ? '…' : 'Place campaign'}</button></div>
    </form>
  );
}
