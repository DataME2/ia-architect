'use client';

import { useActionState } from 'react';

import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { IDLE_FORM } from '../../web/form-result.ts';
import { MARKETING_CONSENT_WORDING } from '../../web/prospect-form.ts';
import { enterDemoAction } from './actions.ts';

/**
 * The whole of the front door: two fields, one required, no password.
 *
 * Anything more is a prospect who closed the tab. The email is asked for
 * because it is the only thing worth having from this page; the phone is
 * offered because a club that is interested enough to look is worth ringing.
 */
export function EnterDemoForm() {
  const [state, formAction, pending] = useActionState(enterDemoAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />

      <fieldset>
        <legend>See the demonstration club</legend>

        <div className="field">
          <label htmlFor="email">Your email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            No password, and no account to create. We use it to know who has looked.
          </p>
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            Only if you would rather be called than emailed.
          </p>
        </div>

        {/*
          Unticked in the markup, not merely in the styling: a pre-ticked
          box is not consent, and `defaultChecked` would make this whole
          record worthless as evidence (BR93). The text is the same constant
          the action stores, so what is agreed to and what is recorded
          cannot drift.
        */}
        <div className="field consent-field">
          <label htmlFor="marketingConsent" className="consent-label">
            <input id="marketingConsent" name="marketingConsent" type="checkbox" />
            <span>{MARKETING_CONSENT_WORDING}</span>
          </label>
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Opening…' : 'Open the demonstration club'}
        </button>
      </div>
    </form>
  );
}
