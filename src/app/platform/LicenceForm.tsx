'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { standing, type ClubLicence } from '../../web/platform-view.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { setLicenceAction } from './actions.ts';

const LABEL: Record<string, string> = {
  none: 'no licence recorded',
  trial: 'trial',
  active: 'licensed',
  expiring: 'renewal due',
  lapsed: 'lapsed',
  suspended: 'suspended',
  ended: 'ended',
};

export function LicencePill({
  licence,
  today,
}: {
  readonly licence: ClubLicence | null;
  readonly today: string;
}) {
  const s = standing(licence, today);
  const tone =
    s.kind === 'active' ? 'pill-ok' : s.kind === 'trial' || s.kind === 'expiring' ? 'pill-warn' : 'pill-stop';

  const detail =
    s.kind === 'expiring'
      ? ` — ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left`
      : s.kind === 'lapsed'
        ? ` — ${s.daysAgo} day${s.daysAgo === 1 ? '' : 's'} ago`
        : s.kind === 'trial'
          ? ` — ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'} left`
          : '';

  return (
    <span className={`pill ${tone}`}>
      {LABEL[s.kind]}
      {detail}
    </span>
  );
}

export function LicenceForm({
  clubId,
  clubName,
  licence,
}: {
  readonly clubId: string;
  readonly clubName: string;
  readonly licence: ClubLicence | null;
}) {
  const [state, formAction, pending] = useActionState(setLicenceAction, IDLE_FORM);

  return (
    <details className="process-detail">
      <summary>{licence === null ? 'Record a licence' : 'Change the licence'}</summary>
      <form action={formAction} className="stack" style={{ marginTop: '0.75rem' }}>
        <FormNotice result={state} />
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="clubName" value={clubName} />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 8rem' }}>
            <label htmlFor={`state-${clubId}`}>State</label>
            <select id={`state-${clubId}`} name="state" defaultValue={licence?.state ?? 'active'}>
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
              <option value="ended">ended</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 9rem' }}>
            <label htmlFor={`starts-${clubId}`}>From</label>
            <input
              id={`starts-${clubId}`}
              name="startsOn"
              type="date"
              defaultValue={licence?.startsOn ?? ''}
              required
            />
          </div>
          <div className="field" style={{ flex: '1 1 9rem' }}>
            <label htmlFor={`ends-${clubId}`}>To</label>
            <input
              id={`ends-${clubId}`}
              name="endsOn"
              type="date"
              defaultValue={licence?.endsOn ?? ''}
              required
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 8rem' }}>
            <label htmlFor={`fee-${clubId}`}>Agreed fee</label>
            <input
              id={`fee-${clubId}`}
              name="fee"
              inputMode="decimal"
              placeholder="12000"
              defaultValue={licence?.feeCents != null ? String(licence.feeCents / 100) : ''}
            />
          </div>
          <div className="field" style={{ flex: '0 0 6rem' }}>
            <label htmlFor={`currency-${clubId}`}>Currency</label>
            <select id={`currency-${clubId}`} name="currency" defaultValue={licence?.currency ?? 'AUD'}>
              <option value="AUD">AUD</option>
              <option value="NZD">NZD</option>
            </select>
          </div>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          Leave the fee blank if none was agreed &mdash; that is a different fact from zero, and
          recording zero would claim a price nobody set.
        </p>

        <div className="field">
          <label htmlFor={`note-${clubId}`}>What was agreed</label>
          <input
            id={`note-${clubId}`}
            name="note"
            defaultValue={licence?.note ?? ''}
            placeholder="Includes migration of three seasons; invoiced annually in advance"
          />
        </div>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Recording…' : 'Record licence'}
          </button>
        </div>
      </form>
    </details>
  );
}
