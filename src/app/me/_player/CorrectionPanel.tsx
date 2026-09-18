'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FOOT_LABEL, POSITION_LABEL } from '../../../web/player-view.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import type { PlayerCorrection } from '../../../data/player-record-correction.ts';
import { proposeCorrectionAction } from './actions.ts';

/**
 * A player's own claim about their record (BR148), and its state.
 *
 * Only rendered for a player who is eighteen or over — the caller checks
 * `ageAt`, the same gate the database's own trigger enforces, so this
 * component's job is showing the form, not re-deriving who may see it.
 *
 * A pending claim's proposed values are shown as **what was asked for**,
 * never as the confirmed record — nothing here lets a reader mistake one
 * for the other, which is the whole point of BR148.
 */
export function CorrectionPanel({
  clubId,
  registrationId,
  pending,
}: {
  readonly clubId: string;
  readonly registrationId: string;
  readonly pending: PlayerCorrection | null;
}) {
  const [result, action, submitting] = useActionState(proposeCorrectionAction, IDLE_FORM);

  if (pending !== null && pending.state === 'pending') {
    return (
      <div className="stack">
        <p className="hint" style={{ margin: 0 }}>
          <strong>Waiting for a coach or admin to confirm:</strong>{' '}
          {pending.fields.preferredName !== undefined && `known as "${pending.fields.preferredName}"`}
          {pending.fields.email !== undefined && `email ${pending.fields.email}`}
          {pending.fields.preferredPosition !== undefined &&
            `preferred position ${POSITION_LABEL[pending.fields.preferredPosition] ?? pending.fields.preferredPosition}`}
          {pending.fields.secondaryPosition !== undefined &&
            `, also ${POSITION_LABEL[pending.fields.secondaryPosition] ?? pending.fields.secondaryPosition}`}
          {pending.fields.preferredFoot !== undefined &&
            `${FOOT_LABEL[pending.fields.preferredFoot] ?? pending.fields.preferredFoot}-footed`}
          {pending.fields.squadNumber !== undefined && `squad number ${pending.fields.squadNumber}`}
          . Nothing changes until then (BR148).
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="registrationId" value={registrationId} />
      <FormNotice result={result} />

      <p className="hint" style={{ margin: 0 }}>
        Propose a correction. A coach or admin confirms it before anyone else sees it.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 10rem' }}>
          <span>Known as</span>
          <input name="preferredName" placeholder="Leave blank to keep as is" />
        </label>
        <label style={{ flex: '1 1 12rem' }}>
          <span>Email</span>
          <input name="email" type="email" placeholder="Leave blank to keep as is" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ flex: '1 1 8rem' }}>
          <span>Preferred position</span>
          <select name="preferredPosition" defaultValue="">
            <option value="">Unchanged</option>
            {Object.entries(POSITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 8rem' }}>
          <span>Secondary position</span>
          <select name="secondaryPosition" defaultValue="">
            <option value="">Unchanged</option>
            {Object.entries(POSITION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 6rem' }}>
          <span>Preferred foot</span>
          <select name="preferredFoot" defaultValue="">
            <option value="">Unchanged</option>
            {Object.entries(FOOT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label style={{ flex: '1 1 5rem' }}>
          <span>Squad number</span>
          <input name="squadNumber" inputMode="numeric" placeholder="1–99" />
        </label>
      </div>

      <div>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send for confirmation'}
        </button>
      </div>
    </form>
  );
}
