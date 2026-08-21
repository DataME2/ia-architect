'use client';

import { useActionState } from 'react';

import { attachVoucherAction } from '../actions.ts';

export function AttachVoucherForm({
  registrationId,
  defaultProgram,
}: {
  readonly registrationId: string;
  readonly defaultProgram: string;
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    attachVoucherAction,
    null,
  );

  return (
    <>
      {error !== null && (
        <div className="errors">
          <strong>{error}</strong>
        </div>
      )}

      <form action={formAction} className="stack">
        <input type="hidden" name="registrationId" value={registrationId} />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor="program">Program</label>
            <input id="program" name="program" defaultValue={defaultProgram} />
          </div>
          <div style={{ flex: '1 1 9rem' }}>
            <label htmlFor="code">Voucher code</label>
            <input id="code" name="code" autoComplete="off" />
          </div>
          <div style={{ flex: '1 1 7rem' }}>
            <label htmlFor="value">Value</label>
            <input id="value" name="value" inputMode="decimal" placeholder="200.00" />
          </div>
        </div>

        <div>
          <label htmlFor="file">Voucher document (PDF, optional)</label>
          <input id="file" name="file" type="file" accept="application/pdf" />
          <p className="hint">
            Optional on purpose — a code recorded now beats waiting for a scan that arrives next
            week. Attach the PDF when you have it.
          </p>
        </div>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Attaching…' : 'Attach voucher'}
          </button>
        </div>
      </form>

      <p className="hint">
        <strong>Attaching changes nothing yet (BR81).</strong> The balance stands, so the
        registration keeps failing BR3 and the player stays off the field under BR79 until
        somebody checks the code is genuine. A voucher that turns out to be expired or already
        spent would otherwise have let a child play on money the club never receives.
      </p>
    </>
  );
}
