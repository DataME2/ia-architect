'use client';

import { useActionState } from 'react';

import type { HardshipRequest } from '../../../data/hardship.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { decideHardshipAction, requestHardshipAction } from './actions.ts';

/** A family asks for a hardship override of BR79 (BR164). */
export function HardshipRequestForm({
  clubId,
  registrationId,
  personId,
  playerName,
}: {
  readonly clubId: string;
  readonly registrationId: string;
  readonly personId: string;
  readonly playerName: string;
}) {
  const [state, action, pending] = useActionState(requestHardshipAction, IDLE_FORM);
  const id = `hardship-${registrationId}`;
  return (
    <form action={action} className="stack" style={{ gap: '0.4rem' }}>
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="personId" value={personId} />
      <label htmlFor={id}>
        Can&rsquo;t pay this week? Ask the committee to let {playerName} play meanwhile.
      </label>
      <textarea id={id} name="reason" rows={2} placeholder="Why, in a sentence or two" />
      <FormNotice result={state} />
      <div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Ask for hardship'}
        </button>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        The amount is still owed. Only the committee reads your reason; a coach is told only whether{' '}
        {playerName} may play (BR78, BR164).
      </p>
    </form>
  );
}

/** One request, decided by the committee (BR164). */
export function HardshipDecisionRow({ clubId, request }: { readonly clubId: string; readonly request: HardshipRequest }) {
  const [state, action, pending] = useActionState(decideHardshipAction, IDLE_FORM);
  return (
    <li>
      <span className="ctitle">{request.playerName}</span>{' '}
      <span className="hint">asked {request.requestedAt.slice(0, 10)}</span>
      <br />
      <span className="cnote">&ldquo;{request.reason}&rdquo;</span>
      <form action={action} className="row" style={{ gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="requestId" value={request.id} />
        <label>
          Until <input type="date" name="validUntil" />
        </label>
        <label>
          Note <input name="note" placeholder="Required to decline" />
        </label>
        <button type="submit" name="decision" value="approve" disabled={pending}>Approve</button>
        <button type="submit" name="decision" value="decline" className="secondary" disabled={pending}>Decline</button>
        <FormNotice result={state} />
      </form>
    </li>
  );
}
