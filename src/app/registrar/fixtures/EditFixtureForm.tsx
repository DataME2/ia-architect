'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { updateFixtureAction } from './actions.ts';

/**
 * Change a fixture, and tell everyone (BR64, scope 38 WP4).
 *
 * Only the three fields BR64 names — time, venue and status. A score or an
 * opponent changing is a correction to the record of a game that happened;
 * these three are the ones a person needs to act on before it does.
 */
export function EditFixtureForm({
  fixtureId,
  kickOff,
  venue,
  status,
}: {
  readonly fixtureId: string;
  readonly kickOff: string | null;
  readonly venue: string | null;
  readonly status: string;
}) {
  const [result, action, pending] = useActionState(updateFixtureAction, IDLE_FORM);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <FormNotice result={result} />

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '0 1 8rem' }}>
          <label htmlFor={`kick-${fixtureId}`}>Kick-off</label>
          <input id={`kick-${fixtureId}`} name="kickOff" type="time" defaultValue={kickOff ?? ''} />
        </div>
        <div className="field" style={{ flex: '1 1 10rem' }}>
          <label htmlFor={`venue-${fixtureId}`}>Venue</label>
          <input id={`venue-${fixtureId}`} name="venue" defaultValue={venue ?? ''} />
        </div>
        <div className="field" style={{ flex: '0 1 8rem' }}>
          <label htmlFor={`status-${fixtureId}`}>Status</label>
          <select id={`status-${fixtureId}`} name="status" defaultValue={status}>
            <option value="scheduled">Scheduled</option>
            <option value="played">Played</option>
            <option value="cancelled">Cancelled</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </div>

      <p className="hint" style={{ margin: 0 }}>
        Everyone appointed to this fixture and everyone in the team is told what changed (BR64).
        Anyone who has asked not to be emailed is skipped, and you will be told who.
      </p>
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save and tell everyone'}</button>
    </form>
  );
}
