'use client';

import { useActionState } from 'react';

import { Button } from '../../components/ui/Button.tsx';
import { CheckboxField } from '../../components/ui/CheckboxField.tsx';
import { Callout } from '../../components/ui/PublicEntrance.tsx';
import { TextField } from '../../components/ui/TextField.tsx';
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
    <form action={formAction} className="flex flex-col gap-ds-4">
      {state.status === 'error' && (
        <Callout tone="error" title="The demo did not open">
          {state.message}
        </Callout>
      )}
      {state.status === 'ok' && (
        <Callout tone="success" title="Opening the demo">
          {state.message}
        </Callout>
      )}

      <div className="flex flex-col gap-ds-3 p-ds-4 rounded-sm border border-border">
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          hint="No password, and no account to create."
        />
        <TextField id="phone" name="phone" type="tel" label="Phone · optional" autoComplete="tel" />
      </div>

      {/*
        Unticked in the markup, not merely in the styling: a pre-ticked box is
        not consent, and `defaultChecked` would make this whole record
        worthless as evidence (BR93). The text is the same constant the action
        stores, so what is agreed to and what is recorded cannot drift.
      */}
      <CheckboxField id="marketingConsent" name="marketingConsent" label={MARKETING_CONSENT_WORDING} />

      <p className="m-0 text-[13px] text-muted-foreground">
        Marketing consent is separately optional and unticked. Phone is optional. Neither is needed to explore the
        demo.
      </p>

      <div className="flex flex-wrap items-center gap-ds-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Opening…' : 'Enter read-only demo'}
        </Button>
        <a className="min-h-[44px] inline-flex items-center text-[13px] font-semibold text-foreground no-underline hover:underline" href="/">
          Back
        </a>
      </div>

      <Callout tone="info" title="Viewer-only access">
        Demo visitors cannot create, change, approve, send, upload, delete or move money. Every demo identity and club
        is fictional.
      </Callout>
    </form>
  );
}
