'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../web/form-result.ts';
import { JURISDICTIONS } from '../../web/platform-view.ts';
import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { provisionClubAction } from './actions.ts';

export function ProvisionForm() {
  const [state, formAction, pending] = useActionState(provisionClubAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />

      <fieldset>
        <legend>Provision a club</legend>

        <div className="field">
          <label htmlFor="name">Club name</label>
          <input id="name" name="name" required />
        </div>

        <div className="field">
          <label htmlFor="jurisdiction">Jurisdiction</label>
          <select id="jurisdiction" name="jurisdiction" defaultValue="AU-QLD">
            {JURISDICTIONS.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            Decides which privacy framework the club operates under (BR52). Not cosmetic.
          </p>
        </div>

        <div className="field">
          <label htmlFor="adminEmail">First administrator (optional)</label>
          <input id="adminEmail" name="adminEmail" type="email" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            <strong>They must already have an account.</strong> This cannot create one &mdash;
            that needs the service-role key, which no page holds. Ask them to sign up, then
            provision again with the same club name to attach them.
          </p>
        </div>
      </fieldset>

      <fieldset>
        <legend>First season (optional)</legend>
        <div className="field">
          <label htmlFor="seasonName">Name</label>
          <input id="seasonName" name="seasonName" placeholder="2027" />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 10rem' }}>
            <label htmlFor="seasonStarts">Starts</label>
            <input id="seasonStarts" name="seasonStarts" type="date" />
          </div>
          <div className="field" style={{ flex: '1 1 10rem' }}>
            <label htmlFor="seasonEnds">Ends</label>
            <input id="seasonEnds" name="seasonEnds" type="date" />
          </div>
        </div>
        <p className="hint" style={{ margin: 0 }}>
          A season is needed before registrations, teams, roles or links can exist. Safe to add
          later &mdash; provisioning the same club again only fills in what is missing.
        </p>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Provisioning…' : 'Provision club'}
        </button>
      </div>
    </form>
  );
}
