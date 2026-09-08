'use client';

import { useActionState } from 'react';

import type { PlanState } from '../../../domain/finance/types.ts';
import { PAYMENT_METHODS, PLAN_CADENCES } from '../../../domain/finance/types.ts';
import { formatCents } from '../../../web/money.ts';
import { CADENCE_LABEL, METHOD_LABEL, planSummary } from '../../../web/plan-view.ts';
import { createPlanAction, recordPaymentAction } from '../actions.ts';

function Error({ message }: { readonly message: string | null }) {
  return message === null ? null : (
    <div className="errors">
      <strong>{message}</strong>
    </div>
  );
}

export function NewPlanForm({
  registrationId,
  seasonId,
  suggestedTotalCents,
  seasonEndsOn,
}: {
  readonly registrationId: string;
  readonly seasonId: string;
  readonly suggestedTotalCents: number;
  readonly seasonEndsOn: string;
}) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    createPlanAction,
    null,
  );

  return (
    <>
      <Error message={error} />
      <form action={formAction} className="stack">
        <input type="hidden" name="registrationId" value={registrationId} />
        <input type="hidden" name="seasonId" value={seasonId} />

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="total">Total</label>
            <input
              id="total"
              name="total"
              defaultValue={formatCents(Math.max(0, suggestedTotalCents))}
              inputMode="decimal"
            />
          </div>
          <div style={{ flex: '1 1 6rem' }}>
            <label htmlFor="count">Instalments</label>
            <input id="count" name="count" defaultValue="4" inputMode="numeric" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="firstDueOn">First due</label>
            <input id="firstDueOn" name="firstDueOn" type="date" />
          </div>
          <div style={{ flex: '1 1 8rem' }}>
            <label htmlFor="cadence">Every</label>
            <select id="cadence" name="cadence" defaultValue="monthly">
              {PLAN_CADENCES.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {CADENCE_LABEL[cadence]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Agreeing…' : 'Agree this plan'}
          </button>
        </div>
      </form>
      <p className="hint">
        Instalments always sum to exactly the total (BR74) — an uneven split puts the odd cents
        on the <em>first</em> instalment, so the last one stays the round number everybody
        expects. The plan must finish by {seasonEndsOn}, the end of the season (BR76).
      </p>
    </>
  );
}

export function RecordPaymentForm({ registrationId }: { readonly registrationId: string }) {
  const [error, formAction, pending] = useActionState<string | null, FormData>(
    recordPaymentAction,
    null,
  );

  return (
    <>
      <Error message={error} />
      <form
        action={formAction}
        style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}
      >
        <input type="hidden" name="registrationId" value={registrationId} />
        <div style={{ flex: '1 1 7rem' }}>
          <label htmlFor="amount">Amount</label>
          <input id="amount" name="amount" inputMode="decimal" placeholder="30.00" />
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor="receivedOn">Received</label>
          <input id="receivedOn" name="receivedOn" type="date" />
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor="method">How</label>
          <select id="method" name="method" defaultValue="bank-transfer">
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {METHOD_LABEL[method]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 8rem' }}>
          <label htmlFor="reference">Reference</label>
          <input id="reference" name="reference" placeholder="Receipt or transaction id" />
        </div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? 'Recording…' : 'Record'}
        </button>
      </form>
      <p className="hint">
        Append-only (BR77). A refund or a correction is a <strong>negative</strong> entry, never
        an edit — the database holds no update or delete policy on receipts, so a payment cannot
        be rewritten by anyone going through the application.
      </p>
    </>
  );
}

export function PlanSchedule({ state }: { readonly state: PlanState }) {
  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>
        {planSummary(state)}
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {state.installments.map((row) => (
              <tr key={row.installment.sequence}>
                <td>{row.installment.sequence}</td>
                <td>{row.installment.dueOn}</td>
                <td>{formatCents(row.installment.amountCents)}</td>
                <td>{formatCents(row.paidCents)}</td>
                <td>
                  {row.outstandingCents === 0 ? (
                    <span className="pill pill-ok">Paid</span>
                  ) : row.overdue ? (
                    <span className="pill pill-stop">
                      Overdue {formatCents(row.outstandingCents)}
                    </span>
                  ) : (
                    <span className="pill">Due {formatCents(row.outstandingCents)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
