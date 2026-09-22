'use client';

import { useActionState } from 'react';

import { formatCents } from '../../../web/money.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import type { ClaimCandidate, ClaimPreview } from '../../../web/claim-view.ts';
import type { BatchRow, RaisedClaim } from '../../../data/claims.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  addToBatchAction, closeBatchAction, createBatchAction, decideClaimAction, payBatchAction, raiseClaimAction,
} from './actions.ts';

/**
 * A verified appointment a coordinator may raise a claim for.
 *
 * The preview is computed **for display only** — the action re-resolves
 * the rate itself against the schedule in force on the fixture's date, so
 * what is shown here is a preview of what the action will do, never a
 * value trusted from the form.
 */
export function ClaimCandidateRow({
  seasonId,
  candidate,
  preview,
}: {
  readonly seasonId: string;
  readonly candidate: ClaimCandidate;
  readonly preview: ClaimPreview;
}) {
  const [result, action, pending] = useActionState(raiseClaimAction, IDLE_FORM);

  return (
    <tr>
      <td>{candidate.officialName}</td>
      <td>
        {candidate.opponent}, {candidate.playedOn}
      </td>
      <td>
        {preview.kind === 'ready' && formatCents(preview.amountCents)}
        {preview.kind === 'no-rate' && <span className="hint">No rate matches</span>}
        {preview.kind === 'ambiguous' && <span className="hint">More than one rate matches</span>}
      </td>
      <td>
        <form action={action} style={{ display: 'inline' }}>
          <input type="hidden" name="appointmentId" value={candidate.appointmentId} />
          <input type="hidden" name="seasonId" value={seasonId} />
          <button type="submit" disabled={pending || preview.kind !== 'ready'}>
            {pending ? '…' : 'Raise claim'}
          </button>
        </form>
        {result.status === 'error' && <div className="hint">{result.message}</div>}
      </td>
    </tr>
  );
}

const STATE_LABEL: Readonly<Record<RaisedClaim['state'], string>> = {
  raised: 'Raised',
  approved: 'Approved',
  rejected: 'Rejected',
};

/**
 * The treasurer's queue: one claim, decided.
 *
 * Reject requires a reason (BR18's shape); approve does not, because an
 * approval is not a decision anybody has to be able to answer later the
 * way a refusal is.
 */
export function DecideClaimRow({ claim }: { readonly claim: RaisedClaim }) {
  const [result, action, pending] = useActionState(decideClaimAction, IDLE_FORM);

  return (
    <tr>
      <td>{claim.officialName}</td>
      <td>
        {claim.opponent}, {claim.playedOn}
      </td>
      <td>{formatCents(claim.amountCents)}</td>
      <td>
        <span className="pill">{STATE_LABEL[claim.state]}</span>
        {claim.state === 'rejected' && claim.decisionNote !== null && (
          <div className="hint">{claim.decisionNote}</div>
        )}
      </td>
      <td>
        {claim.state === 'raised' && (
          <form action={action} className="stack" style={{ gap: '0.4rem' }}>
            <input type="hidden" name="claimId" value={claim.id} />
            <input
              type="text"
              name="note"
              placeholder="Reason, if rejecting"
              aria-label={`Reason for rejecting ${claim.officialName}'s claim, if rejecting`}
            />
            <div className="row" style={{ gap: '0.4rem' }}>
              <button type="submit" name="decision" value="approve" disabled={pending}>
                {pending ? '…' : 'Approve'}
              </button>
              <button type="submit" name="decision" value="reject" className="secondary" disabled={pending}>
                Reject
              </button>
            </div>
            <FormNotice result={result} />
          </form>
        )}
      </td>
    </tr>
  );
}

export function NewBatch() {
  const [result, action, pending] = useActionState(createBatchAction, IDLE_FORM);

  return (
    <form action={action} className="row" style={{ gap: '0.5rem', alignItems: 'end' }}>
      <p style={{ margin: 0 }}>
        <label htmlFor="reference">Batch reference</label>
        <input id="reference" name="reference" type="text" placeholder="Optional" />
      </p>
      <button type="submit" disabled={pending}>{pending ? '…' : 'New batch'}</button>
      <FormNotice result={result} />
    </form>
  );
}

export function AddApprovedToBatch({
  batchId,
  approved,
}: {
  readonly batchId: string;
  readonly approved: readonly RaisedClaim[];
}) {
  const [result, action, pending] = useActionState(addToBatchAction, IDLE_FORM);

  if (approved.length === 0) return <p className="hint">No approved, unbatched claims to add.</p>;

  return (
    <form action={action} className="stack">
      <input type="hidden" name="batchId" value={batchId} />
      {approved.map((c) => (
        <label key={c.id} className="row" style={{ gap: '0.5rem' }}>
          <input type="checkbox" name="claimId" value={c.id} />
          {c.officialName} &mdash; {c.opponent}, {c.playedOn} &mdash; {formatCents(c.amountCents)}
          {c.settlement === null ? (
            <span className="hint"> &mdash; awaiting their choice (BR152)</span>
          ) : (
            <span className="pill" style={{ marginLeft: '0.3rem' }}>
              {c.settlement === 'pay' ? 'pay' : 'credit next season'}
            </span>
          )}
        </label>
      ))}
      <FormNotice result={result} />
      <p>
        <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add selected to this batch'}</button>
      </p>
    </form>
  );
}

export function BatchCard({ batch }: { readonly batch: BatchRow }) {
  const [closeResult, closeAction, closing] = useActionState(closeBatchAction, IDLE_FORM);
  const [payResult, payAction, paying] = useActionState(payBatchAction, IDLE_FORM);

  const standing = batch.paidAt !== null ? 'paid' : batch.closedAt !== null ? 'closed' : 'open';

  return (
    <div className="card">
      <p style={{ margin: 0 }}>
        <b>{batch.reference ?? 'Untitled batch'}</b> <span className="pill">{standing}</span>
        <br />
        <span className="hint">
          {batch.claimCount} claim{batch.claimCount === 1 ? '' : 's'} &mdash; {formatCents(batch.totalCents)}
        </span>
      </p>

      {standing === 'open' && (
        <form action={closeAction}>
          <input type="hidden" name="batchId" value={batch.id} />
          <input type="hidden" name="totalCents" value={batch.totalCents} />
          <input type="hidden" name="claimCount" value={batch.claimCount} />
          <button type="submit" disabled={closing}>{closing ? '…' : 'Close batch'}</button>
          <FormNotice result={closeResult} />
        </form>
      )}

      {standing === 'closed' && (
        <form action={payAction} className="row" style={{ gap: '0.5rem', alignItems: 'end' }}>
          <input type="hidden" name="batchId" value={batch.id} />
          <input type="hidden" name="closedAt" value={batch.closedAt ?? ''} />
          <p style={{ margin: 0 }}>
            <label htmlFor={`ref-${batch.id}`}>Paid reference</label>
            <input id={`ref-${batch.id}`} name="paidReference" type="text" placeholder="Optional" />
          </p>
          <button type="submit" disabled={paying}>{paying ? '…' : 'Record as paid'}</button>
          <FormNotice result={payResult} />
        </form>
      )}

      {standing === 'paid' && <p className="hint" style={{ marginBottom: 0 }}>Paid {batch.paidAt?.slice(0, 10)}.</p>}
    </div>
  );
}
