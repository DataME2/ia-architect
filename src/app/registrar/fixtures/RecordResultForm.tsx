'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { recordFixtureResultAction } from './actions.ts';

/**
 * Enter or correct a fixture's result, separate from `EditFixtureForm`'s
 * BR64 fields on purpose — a score is a correction to a game that already
 * happened, not a change somebody needs to act on before it does, so
 * nobody is notified when this form saves.
 */
export function RecordResultForm({
  fixtureId,
  goalsFor,
  goalsAgainst,
}: {
  readonly fixtureId: string;
  readonly goalsFor: number | null;
  readonly goalsAgainst: number | null;
}) {
  const [result, action, pending] = useActionState(recordFixtureResultAction, IDLE_FORM);

  return (
    <form action={action} style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <div className="field" style={{ flex: '0 1 6rem' }}>
        <label htmlFor={`gf-${fixtureId}`}>Scored</label>
        <input
          id={`gf-${fixtureId}`}
          name="goalsFor"
          inputMode="numeric"
          defaultValue={goalsFor ?? ''}
        />
      </div>
      <div className="field" style={{ flex: '0 1 6rem' }}>
        <label htmlFor={`ga-${fixtureId}`}>Conceded</label>
        <input
          id={`ga-${fixtureId}`}
          name="goalsAgainst"
          inputMode="numeric"
          defaultValue={goalsAgainst ?? ''}
        />
      </div>
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? 'Saving…' : 'Save result'}
      </button>
      {result.status === 'error' && <span className="hint">{result.message}</span>}
    </form>
  );
}
