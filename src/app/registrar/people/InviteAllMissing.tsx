'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { inviteAllMissingAction } from './actions.ts';

/**
 * One press for players marked before links went out on their own
 * (scope 68 WP2). From now on, marking PLAYER on a COMPLETE registration —
 * or a registration becoming COMPLETE — sends them without this.
 */
export function InviteAllMissing({ seasonId }: { readonly seasonId: string }) {
  const [result, formAction, pending] = useActionState(inviteAllMissingAction, IDLE_FORM);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Workspace links</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        A player whose registration is COMPLETE gets their links automatically: under 13, their
        guardian; 13 to 17, their guardian and themselves; 18 and over, themselves. Players marked
        before this existed may be missing theirs &mdash; this sends every missing one, once.
      </p>
      <form action={formAction}>
        <input type="hidden" name="seasonId" value={seasonId} />
        <button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send all missing workspace links'}
        </button>
      </form>
      <FormNotice result={result} />
    </div>
  );
}
