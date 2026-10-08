'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { MODEL_LABEL, type PricingModel } from '../../../web/sponsor-billing.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  createCampaignAction,
  recordAcquisitionsAction,
  saveSponsorSettingsAction,
  setCampaignStatusAction,
} from './actions.ts';

const AUDIENCE_LABEL = {
  guardian: 'Guardians',
  coach: 'Coaches',
  referee: 'Referees (18+)',
  player: 'Players (18+)',
  committee: 'Committee',
} as const;

export function NewCampaignForm() {
  const [state, action, pending] = useActionState(createCampaignAction, IDLE_FORM);
  return (
    <form action={action} className="stack" style={{ gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>Sponsor <input name="sponsorName" placeholder="Corner Café" /></label>
        <label>Link <input name="linkUrl" placeholder="https://…" /></label>
      </div>
      <label>Headline (90) <input name="headline" maxLength={90} placeholder="Free coffee for parents on match day" /></label>
      <label>Text (optional, 200) <input name="body" maxLength={200} /></label>
      <label>
        Banner (optional: PNG, JPEG or WebP, up to 1 MB; 728×90 recommended){' '}
        <input name="banner" type="file" accept="image/png,image/jpeg,image/webp" />
      </label>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>
          Model{' '}
          <select name="pricingModel" defaultValue="cpc">
            {(Object.keys(MODEL_LABEL) as PricingModel[]).map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
          </select>
        </label>
        <label>Rate ($) <input name="rate" inputMode="decimal" style={{ width: '6rem' }} placeholder="0.50" /></label>
        <label>From <input type="date" name="startsOn" /></label>
        <label>Until <input type="date" name="endsOn" /></label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>Show in the workspace of</legend>
        {(Object.keys(AUDIENCE_LABEL) as (keyof typeof AUDIENCE_LABEL)[]).map((a) => (
          <label key={a} style={{ marginRight: '0.8rem' }}>
            <input type="checkbox" name="audience" value={a} defaultChecked={a === 'guardian' || a === 'coach'} /> {AUDIENCE_LABEL[a]}
          </label>
        ))}
      </fieldset>
      <FormNotice result={state} />
      <div><button type="submit" disabled={pending}>{pending ? '…' : 'Create campaign'}</button></div>
      <p className="hint" style={{ margin: 0 }}>
        Shown only to adults, labelled &ldquo;Sponsored&rdquo;. The sponsor receives counts, never who saw or clicked.{' '}
        <span className="mono" style={{ fontSize: '0.7rem' }}>BR169 · BR170</span>
      </p>
    </form>
  );
}

export function CampaignStatusButton({ id, status, label }: { readonly id: string; readonly status: string; readonly label: string }) {
  const [state, action, pending] = useActionState(setCampaignStatusAction, IDLE_FORM);
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }} disabled={pending}>
        {label}
      </button>
      <FormNotice result={state} />
    </form>
  );
}

export function RecordAcquisitionsForm({ id }: { readonly id: string }) {
  const [state, action, pending] = useActionState(recordAcquisitionsAction, IDLE_FORM);
  return (
    <form action={action} className="row" style={{ gap: '0.4rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="hidden" name="id" value={id} />
      <label>Day <input type="date" name="onDay" /></label>
      <label>Acquisitions <input type="number" name="count" min={1} style={{ width: '5rem' }} /></label>
      <button type="submit" className="secondary" disabled={pending}>Record</button>
      <FormNotice result={state} />
    </form>
  );
}

export function SponsorSettingsForm({ accepts, sharePct }: { readonly accepts: boolean; readonly sharePct: number }) {
  const [state, action, pending] = useActionState(saveSponsorSettingsAction, IDLE_FORM);
  return (
    <form action={action} className="stack" style={{ gap: '0.4rem' }}>
      <label>
        <input type="checkbox" name="accepts" defaultChecked={accepts} /> Accept Let&rsquo;sDataTalk&rsquo;s platform
        campaigns in our members&rsquo; workspaces (the club receives {sharePct}% of what they earn here)
      </label>
      <FormNotice result={state} />
      <div><button type="submit" className="secondary" disabled={pending}>Save</button></div>
    </form>
  );
}
