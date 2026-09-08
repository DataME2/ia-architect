'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { createFixtureAction } from './actions.ts';

export function FixtureForm({ seasonId }: { readonly seasonId: string }) {
  const [state, formAction, pending] = useActionState(createFixtureAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <input type="hidden" name="seasonId" value={seasonId} />

      <fieldset>
        <legend>Record a fixture</legend>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '0 1 10rem' }}>
            <label htmlFor="playedOn">Date</label>
            <input id="playedOn" name="playedOn" type="date" required />
          </div>
          <div className="field" style={{ flex: '1 1 12rem' }}>
            <label htmlFor="opponent">Opponent</label>
            <input id="opponent" name="opponent" required />
          </div>
          <div className="field" style={{ flex: '0 1 8rem' }}>
            <label htmlFor="homeAway">Home or away</label>
            <select id="homeAway" name="homeAway" defaultValue="home">
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 10rem' }}>
            <label htmlFor="competition">Competition</label>
            <input
              id="competition"
              name="competition"
              placeholder="U12 Div 2, friendly, carnival…"
            />
          </div>
          <div className="field" style={{ flex: '0 1 6rem' }}>
            <label htmlFor="goalsFor">Scored</label>
            <input id="goalsFor" name="goalsFor" inputMode="numeric" />
          </div>
          <div className="field" style={{ flex: '0 1 6rem' }}>
            <label htmlFor="goalsAgainst">Conceded</label>
            <input id="goalsAgainst" name="goalsAgainst" inputMode="numeric" />
          </div>
          <div className="field" style={{ flex: '0 1 8rem' }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="played">
              <option value="played">Played</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="abandoned">Abandoned</option>
              <option value="forfeited">Forfeited</option>
            </select>
          </div>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          Competition is free text: the association&rsquo;s catalogue is not modelled yet, and a
          dropdown nobody has filled in would just stay empty.
        </p>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Recording…' : 'Record fixture'}
        </button>
      </div>
    </form>
  );
}
