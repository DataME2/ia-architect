'use client';

import { useActionState } from 'react';

import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { unsubscribeAction } from './actions.ts';

export function UnsubscribeForm({ link }: { readonly link: string }) {
  const [result, action, pending] = useActionState(unsubscribeAction, IDLE_FORM);

  // Once it is done, the choice is gone: leaving the buttons up invites a
  // second press and reads as though the first did nothing.
  if (result.status === 'ok') {
    return <FormNotice result={result} />;
  }

  return (
    <form action={action}>
      <input type="hidden" name="link" value={link} />
      <FormNotice result={result} />

      <fieldset>
        <legend>What would you like to stop?</legend>

        <label>
          <input type="radio" name="scope" value="marketing" defaultChecked />
          <span>
            <strong>Club news and updates.</strong> You will still get messages about your own
            registration, your child&rsquo;s, or a match you are involved in.
          </span>
        </label>

        <label>
          <input type="radio" name="scope" value="all" />
          <span>
            <strong>Every email.</strong> Your club will be shown that you cannot be emailed, and
            will need to contact you another way.
          </span>
        </label>
      </fieldset>

      <button type="submit" disabled={pending}>
        {pending ? 'Stopping…' : 'Stop these emails'}
      </button>
    </form>
  );
}
