'use client';

import { useActionState } from 'react';

import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { unsubscribeAction } from './actions.ts';

/**
 * Two buttons, not a radio group and a generic button.
 *
 * The first version used radios with a default. React resets a form after
 * its action completes, so a person who chose *every email*, hit an error
 * and pressed the button again would have silently sent *marketing only* —
 * a withdrawal narrowed by a retry, which is the one thing this page must
 * never do. Making the inputs controlled did not fix it either, because the
 * reset happens below React's re-render.
 *
 * So there is no selection to lose: each button carries its own `value` and
 * says what it does. The failure mode is gone by construction rather than
 * avoided by remembering, which is the same reason suppression has one door
 * in the database.
 */
export function UnsubscribeForm({ link }: { readonly link: string }) {
  const [result, action, pending] = useActionState(unsubscribeAction, IDLE_FORM);

  // Once it is done, the choice is gone: leaving the buttons up invites a
  // second press and reads as though the first did nothing.
  if (result.status === 'ok') {
    return <FormNotice result={result} />;
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="link" value={link} />
      <FormNotice result={result} />

      <div className="stack">
        <div>
          <button type="submit" name="scope" value="marketing" disabled={pending}>
            {pending ? 'Stopping…' : 'Stop club news and updates'}
          </button>
          <p className="hint" style={{ margin: 'var(--space-1) 0 0' }}>
            You will still get messages about your own registration, your child&rsquo;s, or a match
            you are involved in.
          </p>
        </div>

        <div>
          <button type="submit" name="scope" value="all" disabled={pending}>
            {pending ? 'Stopping…' : 'Stop every email'}
          </button>
          <p className="hint" style={{ margin: 'var(--space-1) 0 0' }}>
            Your club will be shown that you cannot be emailed, and will need to contact you another
            way.
          </p>
        </div>
      </div>
    </form>
  );
}
