'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { disposalWarning } from '../../../web/privacy-view.ts';
import { RETENTION_BASES } from '../../../domain/privacy/types.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  decideRequestAction,
  disposeAction,
  recordBasisAction,
  recordRequestAction,
  runReviewAction,
  transferAuthorityAction,
} from './actions.ts';

const BASIS_LABEL: Record<string, string> = {
  statutory_financial: 'The club must keep its financial records',
  child_safety: 'Child-safety records must be kept',
  active_eligibility: 'A current registration the governing body relies on',
  life_member: 'Held as a life member, permanently',
  legal_hold: 'Subject to a legal hold',
};

export function RunReviewForm() {
  const [result, action, pending] = useActionState(runReviewAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <p className="hint" style={{ margin: 0 }}>
        Works out where every record stands against the club&rsquo;s retention rules.{' '}
        <strong>It deletes nothing</strong> — anything past its period is listed below for you to
        decide on.
      </p>
      <button type="submit" disabled={pending}>{pending ? 'Reviewing…' : 'Review retention now'}</button>
    </form>
  );
}

export function TransferAuthorityForm() {
  const [result, action, pending] = useActionState(transferAuthorityAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <p className="hint" style={{ margin: 0 }}>
        Ends a guardian&rsquo;s authority over anyone who has turned eighteen (BR67). They stay a
        recorded contact — only the authority moves.
      </p>
      <button type="submit" disabled={pending}>{pending ? 'Transferring…' : 'Transfer authority where it is due'}</button>
    </form>
  );
}

export function DecideRequestForm({ requestId }: { readonly requestId: string }) {
  const [result, action, pending] = useActionState(decideRequestAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="requestId" value={requestId} />
      <FormNotice result={result} />
      <p className="hint" style={{ margin: 0 }}>
        The answer is worked out now, from the reasons recorded now. If nothing requires the record
        to be kept, <strong>it is deleted and cannot be recovered</strong>.
      </p>
      <button type="submit" disabled={pending}>{pending ? 'Deciding…' : 'Answer this request'}</button>
    </form>
  );
}

export function DisposeForm({
  reviewId,
  personName,
}: {
  readonly reviewId: string;
  readonly personName: string;
}) {
  const [result, action, pending] = useActionState(disposeAction, IDLE_FORM);
  return (
    <form action={action}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <FormNotice result={result} />
      {/* The warning is composed in src/web/, so what it promises is tested
          rather than typed into a component and hoped for. */}
      <p className="hint" style={{ margin: '0 0 var(--space-2)' }}>{disposalWarning(personName)}</p>
      <button type="submit" disabled={pending}>{pending ? 'Disposing…' : `Dispose of ${personName}'s record`}</button>
    </form>
  );
}

export function RecordRequestForm() {
  const [result, action, pending] = useActionState(recordRequestAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label>
        <span>Person ID</span>
        <input name="personId" required placeholder="The record the request is about" />
      </label>
      <label>
        <span>What the family asked for</span>
        <textarea name="detail" rows={2} placeholder="In their words, as far as you have it" />
      </label>
      <button type="submit" disabled={pending}>{pending ? 'Recording…' : 'Record the request'}</button>
    </form>
  );
}

export function RecordBasisForm() {
  const [result, action, pending] = useActionState(recordBasisAction, IDLE_FORM);
  return (
    <form action={action} className="stack">
      <FormNotice result={result} />
      <label>
        <span>Person ID</span>
        <input name="personId" required />
      </label>
      <label>
        <span>Reason the record must be kept</span>
        <select name="basis" required defaultValue="statutory_financial">
          {RETENTION_BASES.map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
        </select>
      </label>
      <label>
        <span>Until</span>
        <input type="date" name="expiresOn" />
        <span className="hint">
          Leave empty for no end date — the record then can never be erased while this stands.
        </span>
      </label>
      <label>
        <span>Detail</span>
        <input name="detail" placeholder="Optional — what this refers to" />
      </label>
      <button type="submit" disabled={pending}>{pending ? 'Recording…' : 'Record this reason'}</button>
    </form>
  );
}
