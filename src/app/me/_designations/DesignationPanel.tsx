'use client';

import { useActionState, useState } from 'react';

import {
  awaitingAnswer, proposedTo, roleLabel, type OfferedDesignation,
} from '../../../web/designation-answer.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { answerDesignationAction } from './actions.ts';

/**
 * The designations waiting on this household's answer (BR113).
 *
 * One form per row rather than one for the list: a parent answering about
 * Sunday morning should not be able to accept Saturday's by mistake, and a
 * decline's reason belongs to the match it explains.
 *
 * The decline reason appears only once decline is chosen. BR42 refuses a
 * reasonless decline in the database, and a box shown beside "Accept" reads
 * as though accepting needs one too.
 */
export function DesignationPanel({
  clubId,
  offered,
  answerers,
}: {
  readonly clubId: string;
  readonly offered: readonly OfferedDesignation[];
  readonly answerers: Readonly<Record<string, readonly string[]>>;
}) {
  const waiting = awaitingAnswer(offered);

  if (waiting.length === 0) {
    return (
      <p className="hint" style={{ margin: 0 }}>
        Nothing waiting for an answer.
      </p>
    );
  }

  return (
    <div className="stack">
      {waiting.map((o) => (
        <AnswerRow
          key={o.id}
          clubId={clubId}
          offered={o}
          guardians={answerers[o.id] ?? []}
        />
      ))}
    </div>
  );
}

function AnswerRow({
  clubId,
  offered,
  guardians,
}: {
  readonly clubId: string;
  readonly offered: OfferedDesignation;
  readonly guardians: readonly string[];
}) {
  const [result, action, pending] = useActionState(answerDesignationAction, IDLE_FORM);
  const [declining, setDeclining] = useState(false);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="appointmentId" value={offered.id} />

      <p style={{ margin: 0 }}>
        <b>
          {roleLabel(offered.role)} &mdash; {offered.opponent}
        </b>
        <br />
        <span className="mono" style={{ fontSize: '0.75rem' }}>
          {offered.playedOn}
          {offered.kickOff === null ? '' : ` · ${offered.kickOff}`}
        </span>
      </p>

      <p className="hint" style={{ margin: 0 }}>
        {proposedTo(offered.officialName, guardians, offered.answeredByAnAdult)}
      </p>

      <FormNotice result={result} />

      {declining && (
        <p>
          <label htmlFor={`reason-${offered.id}`}>Why are you declining?</label>
          <input
            id={`reason-${offered.id}`}
            name="reason"
            type="text"
            required
            placeholder="A sentence is enough — the club records it (BR42)."
          />
        </p>
      )}

      <p className="row" style={{ margin: 0 }}>
        {declining ? (
          <>
            <button type="submit" name="answer" value="decline" disabled={pending}>
              {pending ? 'Working…' : 'Confirm the decline'}
            </button>
            <button type="button" className="secondary" onClick={() => setDeclining(false)}>
              Back
            </button>
          </>
        ) : (
          <>
            <button type="submit" name="answer" value="accept" disabled={pending}>
              {pending ? 'Working…' : 'Accept'}
            </button>
            <button type="button" className="secondary" onClick={() => setDeclining(true)}>
              Decline
            </button>
          </>
        )}
      </p>
    </form>
  );
}
