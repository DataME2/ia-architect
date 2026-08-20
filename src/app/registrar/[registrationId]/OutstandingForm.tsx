'use client';

import { useActionState } from 'react';

import { formatCents } from '../../../web/money.ts';
import { setOutstandingAction } from '../actions.ts';

export function OutstandingForm({
  registrationId,
  seasonId,
  outstandingCents,
}: {
  readonly registrationId: string;
  readonly seasonId: string;
  readonly outstandingCents: number;
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    setOutstandingAction,
    null,
  );

  return (
    <>
      {error !== null && (
        <div className="errors">
          <strong>{error}</strong>
        </div>
      )}

      <form action={formAction} style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <input type="hidden" name="registrationId" value={registrationId} />
        <input type="hidden" name="seasonId" value={seasonId} />
        <input type="hidden" name="previousCents" value={outstandingCents} />
        <div style={{ flex: '1 1 10rem' }}>
          <label htmlFor="amount">Still outstanding</label>
          <input
            id="amount"
            name="amount"
            defaultValue={formatCents(outstandingCents)}
            inputMode="decimal"
          />
        </div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Saving…' : 'Record'}
        </button>
      </form>
    </>
  );
}
