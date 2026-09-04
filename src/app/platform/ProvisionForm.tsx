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
      {/* The sign-in link must come back to this deployment, and only the
          browser knows which one it is. */}
      <input
        type="hidden"
        name="origin"
        value={typeof window === 'undefined' ? '' : window.location.origin}
      />

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

      </fieldset>

      <fieldset>
        <legend>Who is responsible for this club</legend>
        <p className="hint" style={{ marginTop: 0 }}>
          Required. A club with nobody answerable for it is how a tenant becomes nobody&rsquo;s
          problem. They are emailed a sign-in link when the club is created &mdash; there is no
          account to set up and nothing for you to do afterwards.
        </p>

        <div className="field">
          <label htmlFor="primaryName">Full name</label>
          <input id="primaryName" name="primaryName" required />
        </div>
        <div className="field">
          <label htmlFor="primaryEmail">Email</label>
          <input id="primaryEmail" name="primaryEmail" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="primaryPhone">Phone</label>
          <input id="primaryPhone" name="primaryPhone" type="tel" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Second responsible person</legend>
        <p className="hint" style={{ marginTop: 0 }}>
          Strongly recommended. A club with one administrator cannot remove that administrator,
          and cannot get in at all if they leave &mdash; a deputy is the insurance against both.
          They are emailed the same link and become an administrator too.
        </p>

        <div className="field">
          <label htmlFor="secondaryName">Full name</label>
          <input id="secondaryName" name="secondaryName" />
        </div>
        <div className="field">
          <label htmlFor="secondaryEmail">Email</label>
          <input id="secondaryEmail" name="secondaryEmail" type="email" />
        </div>
        <div className="field">
          <label htmlFor="secondaryPhone">Phone</label>
          <input id="secondaryPhone" name="secondaryPhone" type="tel" />
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
