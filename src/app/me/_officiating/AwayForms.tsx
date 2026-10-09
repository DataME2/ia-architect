'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { addOwnAwayAction, removeOwnAwayAction } from './actions.ts';

/** BR174: a period the official is away. Nothing is offered to them in it. */
export function AddAwayForm({ clubId }: { readonly clubId: string }) {
  const [state, action, pending] = useActionState(addOwnAwayAction, IDLE_FORM);
  return (
    <form action={action} className="row" style={{ gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
      <input type="hidden" name="clubId" value={clubId} />
      <label>
        Away from <input type="date" name="startsOn" required />
      </label>
      <label>
        Until <input type="date" name="endsOn" required />
      </label>
      <label>
        Why (optional) <input name="reason" placeholder="Holiday" />
      </label>
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Add'}
      </button>
      <FormNotice result={state} />
    </form>
  );
}

export function RemoveAwayButton({ clubId, id, label }: { readonly clubId: string; readonly id: string; readonly label: string }) {
  const [state, action, pending] = useActionState(removeOwnAwayAction, IDLE_FORM);
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="secondary" aria-label={`Remove ${label}`} disabled={pending}>
        {pending ? '…' : 'Remove'}
      </button>
      <FormNotice result={state} />
    </form>
  );
}
