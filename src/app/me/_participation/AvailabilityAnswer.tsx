'use client';

import { useActionState, useState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { participationBanner, type ParticipationResponse } from '../../../web/participation-answer.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { answerParticipationAction } from './actions.ts';

/**
 * Available / not available for one fixture (BR62). One form for the one
 * fixture on screen — a household answering for several children answers
 * each from that child's own card, never a shared control that could
 * record the wrong one.
 */
export function AvailabilityAnswer({
  clubId,
  fixtureId,
  personId,
  response,
}: {
  readonly clubId: string;
  readonly fixtureId: string;
  readonly personId: string;
  readonly response: ParticipationResponse | null;
}) {
  const [state, formAction, pending] = useActionState(answerParticipationAction, IDLE_FORM);
  const [declining, setDeclining] = useState(false);
  const banner = participationBanner(response);

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="fixtureId" value={fixtureId} />
      <input type="hidden" name="personId" value={personId} />

      <p style={{ margin: 0 }}>
        <span className={banner.className}>{banner.label}</span>
        {response?.reason !== null && response?.reason !== undefined && (
          <span className="hint" style={{ marginLeft: '0.5rem' }}>
            {response.reason}
          </span>
        )}
      </p>

      <FormNotice result={state} />

      {declining && (
        <p>
          <label htmlFor={`reason-${fixtureId}-${personId}`}>Why not available?</label>
          <input
            id={`reason-${fixtureId}-${personId}`}
            name="reason"
            type="text"
            required
            placeholder="A sentence is enough — only the coach sees it (BR62)."
          />
        </p>
      )}

      <p className="row" style={{ margin: 0 }}>
        {declining ? (
          <>
            <button type="submit" name="answer" value="not_available" disabled={pending}>
              {pending ? 'Working…' : 'Confirm not available'}
            </button>
            <button type="button" className="secondary" onClick={() => setDeclining(false)}>
              Back
            </button>
          </>
        ) : (
          <>
            <button type="submit" name="answer" value="available" disabled={pending}>
              {pending ? 'Working…' : 'Available'}
            </button>
            <button type="button" className="secondary" onClick={() => setDeclining(true)}>
              Not available
            </button>
          </>
        )}
      </p>
    </form>
  );
}
