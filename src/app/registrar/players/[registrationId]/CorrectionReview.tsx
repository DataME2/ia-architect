'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../../web/form-result.ts';
import { FOOT_LABEL, POSITION_LABEL } from '../../../../web/player-view.ts';
import { FormNotice } from '../../_components/FormNotice.tsx';
import type { PlayerCorrection } from '../../../../data/player-record-correction.ts';
import { reviewPlayerRecordCorrectionAction } from './actions.ts';

/**
 * A player's own claim about their record, waiting on a decision (BR148).
 *
 * Shown as a claim, the same discipline `InterestQueue` uses for a declared
 * officiating level: what was asked for, by whom the system trusts to say
 * it was them, not yet a fact.
 */
export function CorrectionReview({
  registrationId,
  correction,
}: {
  readonly registrationId: string;
  readonly correction: PlayerCorrection | null;
}) {
  const [result, action, pending] = useActionState(reviewPlayerRecordCorrectionAction, IDLE_FORM);

  if (correction === null || correction.state !== 'pending') return null;

  const { fields } = correction;

  return (
    <form action={action} className="card stack">
      <input type="hidden" name="registrationId" value={registrationId} />
      <input type="hidden" name="correctionId" value={correction.id} />
      <FormNotice result={result} />

      <p style={{ margin: 0 }}>
        <strong>The player has proposed a correction.</strong> Nothing has changed yet (BR148).
      </p>
      <ul className="check" style={{ margin: 0 }}>
        {fields.preferredName !== undefined && (
          <li><span className="ctitle">Known as</span><span className="cnote">{fields.preferredName}</span></li>
        )}
        {fields.email !== undefined && (
          <li><span className="ctitle">Email</span><span className="cnote">{fields.email}</span></li>
        )}
        {fields.preferredPosition !== undefined && (
          <li><span className="ctitle">Preferred position</span><span className="cnote">{POSITION_LABEL[fields.preferredPosition] ?? fields.preferredPosition}</span></li>
        )}
        {fields.secondaryPosition !== undefined && (
          <li><span className="ctitle">Secondary position</span><span className="cnote">{POSITION_LABEL[fields.secondaryPosition] ?? fields.secondaryPosition}</span></li>
        )}
        {fields.preferredFoot !== undefined && (
          <li><span className="ctitle">Preferred foot</span><span className="cnote">{FOOT_LABEL[fields.preferredFoot] ?? fields.preferredFoot}</span></li>
        )}
        {fields.squadNumber !== undefined && (
          <li><span className="ctitle">Squad number</span><span className="cnote">{fields.squadNumber}</span></li>
        )}
      </ul>

      <label>
        <span>Note</span>
        <input name="note" placeholder="Optional" />
      </label>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" name="accept" value="yes" disabled={pending}>
          {pending ? 'Saving…' : 'Confirm'}
        </button>
        <button type="submit" name="accept" value="no" disabled={pending}>
          Decline
        </button>
      </div>
    </form>
  );
}
