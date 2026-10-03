'use client';

import { useActionState, useState } from 'react';

import { HUB_KIND_LABEL, type HubDocumentKind } from '../../../web/committee-hub.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { fileHubDocumentAction, removeHubDocumentAction, saveHubSettingsAction } from './actions.ts';

interface Option {
  readonly id: string;
  readonly label: string;
}

/** File a committee document (BR168): upload it, or link it in SharePoint. */
export function FileDocumentForm({
  sharepoint,
  terms,
  resolutions,
}: {
  /** The club keeps its hub in SharePoint: documents are linked, not uploaded. */
  readonly sharepoint: boolean;
  readonly terms: readonly Option[];
  readonly resolutions: readonly Option[];
}) {
  const [state, action, pending] = useActionState(fileHubDocumentAction, IDLE_FORM);
  return (
    <form action={action} className="stack" style={{ gap: '0.5rem' }}>
      <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
        <label>
          Kind{' '}
          <select name="kind" defaultValue="minutes">
            {(Object.keys(HUB_KIND_LABEL) as HubDocumentKind[]).map((k) => (
              <option key={k} value={k}>{HUB_KIND_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label>
          Meeting date <input type="date" name="meetingOn" />
        </label>
        <label>
          Term{' '}
          <select name="termId" defaultValue="">
            <option value="">—</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label>
          Resolution{' '}
          <select name="resolutionId" defaultValue="">
            <option value="">—</option>
            {resolutions.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
      </div>
      <label>
        Title <input name="title" placeholder="Minutes, October committee meeting" />
      </label>
      {sharepoint ? (
        <label>
          SharePoint link <input name="url" placeholder="https://your-club.sharepoint.com/…" />
        </label>
      ) : (
        <label>
          File (PDF, Word or a photo, 4 MB) <input name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" />
        </label>
      )}
      <FormNotice result={state} />
      <div>
        <button type="submit" disabled={pending}>{pending ? 'Filing…' : 'File in the hub'}</button>
      </div>
    </form>
  );
}

export function RemoveDocumentButton({ id, title }: { readonly id: string; readonly title: string }) {
  const [state, action, pending] = useActionState(removeHubDocumentAction, IDLE_FORM);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Remove "${title}" from the Committee Hub?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }} disabled={pending}>
        Remove
      </button>
      <FormNotice result={state} />
    </form>
  );
}

/** Where the hub lives (BR168) — the IT Manager's setting. */
export function HubSettingsForm({
  storage,
  siteUrl,
  libraryUrl,
}: {
  readonly storage: 'platform' | 'sharepoint';
  readonly siteUrl: string | null;
  readonly libraryUrl: string | null;
}) {
  const [state, action, pending] = useActionState(saveHubSettingsAction, IDLE_FORM);
  const [mode, setMode] = useState(storage);
  return (
    <form action={action} className="stack" style={{ gap: '0.5rem' }}>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend>Where the committee&rsquo;s documents live</legend>
        <label>
          <input type="radio" name="storage" value="platform" checked={mode === 'platform'} onChange={() => setMode('platform')} />{' '}
          In Let&rsquo;sDataTalk (private, committee only)
        </label>
        <br />
        <label>
          <input type="radio" name="storage" value="sharepoint" checked={mode === 'sharepoint'} onChange={() => setMode('sharepoint')} />{' '}
          In the club&rsquo;s Microsoft 365 SharePoint
        </label>
      </fieldset>
      {mode === 'sharepoint' && (
        <>
          <label>
            SharePoint site <input name="siteUrl" defaultValue={siteUrl ?? ''} placeholder="https://your-club.sharepoint.com/sites/Committee" />
          </label>
          <label>
            Document library <input name="libraryUrl" defaultValue={libraryUrl ?? ''} placeholder="https://your-club.sharepoint.com/sites/Committee/Shared%20Documents" />
          </label>
        </>
      )}
      <FormNotice result={state} />
      <div>
        <button type="submit" disabled={pending}>{pending ? '…' : 'Save'}</button>
      </div>
    </form>
  );
}
