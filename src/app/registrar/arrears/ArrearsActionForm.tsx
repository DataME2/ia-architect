'use client';

import { useActionState } from 'react';

import { recordArrearsActionAction } from '../actions.ts';

/**
 * BR79's follow-up, per row: payment requested, or a documented, reasoned
 * amendment. The reason field is not marked required in the markup —
 * `amendment_recorded` with no reason is refused by the database itself,
 * twice over (the function's check and the table's constraint), and this
 * form's only job is to relay whatever it says rather than re-deriving it.
 */
export function ArrearsActionForm({
  personId,
  seasonId,
}: {
  readonly personId: string;
  readonly seasonId: string;
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    recordArrearsActionAction,
    null,
  );

  return (
    <form
      action={formAction}
      style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}
    >
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      {error !== null && (
        <p className="errors" style={{ flexBasis: '100%', margin: 0 }}><strong>{error}</strong></p>
      )}
      <label style={{ flex: '1 1 12rem' }}>
        <span className="hint">Reason (required for an amendment)</span>
        <input name="reason" type="text" placeholder="e.g. hardship agreed with the family, 14 Feb" />
      </label>
      <button type="submit" name="action" value="payment_requested" disabled={pending}>
        {pending ? 'Recording…' : 'Payment requested'}
      </button>
      <button type="submit" name="action" value="amendment_recorded" className="secondary" disabled={pending}>
        {pending ? 'Recording…' : 'Record amendment'}
      </button>
    </form>
  );
}
