'use client';

import { useActionState } from 'react';

import { FormNotice } from '../registrar/_components/FormNotice.tsx';
import { IDLE_FORM } from '../../web/form-result.ts';
import { ENQUIRY_CONSENT_WORDING } from '../../web/enquiry-form.ts';
import { recordInterestAction } from './actions.ts';

/**
 * Eight fields, and **two of them are required** (BR144).
 *
 * The demonstration door next door asks one thing, because somebody who
 * wants to look has decided nothing yet. A club typing its own name has
 * decided to start a conversation, and asking nothing wastes it — the reply
 * to a contactless enquiry is a round of questions before anything useful
 * can be said. So the rest are asked and marked *optional* in the label
 * itself rather than by an asterisk somewhere else: a field whose
 * optionality you have to infer reads as required.
 */
export function InterestForm() {
  const [state, formAction, pending] = useActionState(recordInterestAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />

      <fieldset>
        <legend>Your club</legend>

        <div className="field">
          <label htmlFor="clubName">Club name</label>
          <input id="clubName" name="clubName" required placeholder="Brisbane Bayside FC" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            The one thing we cannot look up.
          </p>
        </div>

        <div className="field">
          <label htmlFor="jurisdiction">State or region (optional)</label>
          <input
            id="jurisdiction"
            name="jurisdiction"
            placeholder="Queensland, or Auckland"
            autoComplete="address-level1"
          />
        </div>

        <div className="field">
          <label htmlFor="clubSize">Roughly how many registrations a season? (optional)</label>
          <input id="clubSize" name="clubSize" placeholder="about 400, mostly MiniRoos" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            An approximation is genuinely fine — it tells us what to show you.
          </p>
        </div>

        <div className="field">
          <label htmlFor="currentSystem">What do you use today? (optional)</label>
          <input id="currentSystem" name="currentSystem" placeholder="Majestri, or spreadsheets" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            The most useful answer on this form. Moving a club off what it already runs is most
            of the work, so knowing what that is shapes everything we would say back.
          </p>
        </div>
      </fieldset>

      <fieldset>
        <legend>You</legend>

        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="field">
          <label htmlFor="contactName">Your name (optional)</label>
          <input id="contactName" name="contactName" autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="contactRole">Your role at the club (optional)</label>
          <input
            id="contactRole"
            name="contactRole"
            placeholder="Secretary, registrar, committee member"
            autoComplete="organization-title"
          />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            A secretary and a coach asking the same question need different answers.
          </p>
        </div>

        <div className="field">
          <label htmlFor="phone">Phone number (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            Only if you would rather be called than emailed.
          </p>
        </div>

        <div className="field">
          <label htmlFor="note">Anything else (optional)</label>
          <textarea id="note" name="note" rows={3} placeholder="Season starts in March." />
        </div>

        {/*
          Unticked in the markup, not merely in the styling: a pre-ticked box
          is not consent, and `defaultChecked` would make the record
          worthless as evidence (BR93). The text is the same constant the
          action stores, so what is agreed to and what is recorded cannot
          drift. And it is not a condition of a reply — we answer the
          enquiry either way, which is what the wording says.
        */}
        <div className="field consent-field">
          <label htmlFor="marketingConsent" className="consent-label">
            <input id="marketingConsent" name="marketingConsent" type="checkbox" />
            <span>{ENQUIRY_CONSENT_WORDING}</span>
          </label>
        </div>
      </fieldset>

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send the enquiry'}
        </button>
      </div>
    </form>
  );
}
