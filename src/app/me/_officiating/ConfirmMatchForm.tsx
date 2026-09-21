'use client';

import { useActionState } from 'react';

import type { ConfirmableAppointment } from '../../../data/match-confirmation.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { confirmMatchAction } from './actions.ts';

/**
 * "Did the match happen, and was {name} there?" — BR151. One row per
 * appointment, matching `AvailabilityAnswer`'s shape: a household
 * confirming for more than one child answers each from its own row, never
 * a shared control that could confirm the wrong Saturday.
 */
export function ConfirmMatchForm({
  clubId,
  appointment,
}: {
  readonly clubId: string;
  readonly appointment: ConfirmableAppointment;
}) {
  const [state, formAction, pending] = useActionState(confirmMatchAction, IDLE_FORM);

  if (appointment.confirmed) {
    return (
      <li>
        <span className="ctitle">
          {appointment.officialName} vs {appointment.opponent} — {appointment.playedOn}
        </span>
        <br />
        <span className="cnote">Confirmed — thank you.</span>
      </li>
    );
  }

  return (
    <li>
      <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="fixtureId" value={appointment.fixtureId} />
        <input type="hidden" name="personId" value={appointment.personId} />

        <span className="ctitle">
          {appointment.officialName} vs {appointment.opponent} — {appointment.playedOn}
        </span>

        <FormNotice result={state} />

        <p className="row" style={{ margin: 0, gap: '0.5rem', alignItems: 'center' }}>
          <label>
            Scored (optional)
            <input
              name="goalsFor"
              type="number"
              min={0}
              inputMode="numeric"
              style={{ width: '3.5rem' }}
              aria-label={`Goals scored while ${appointment.officialName} officiated`}
            />
          </label>
          <span>–</span>
          <label>
            Conceded
            <input
              name="goalsAgainst"
              type="number"
              min={0}
              inputMode="numeric"
              style={{ width: '3.5rem' }}
              aria-label={`Goals conceded while ${appointment.officialName} officiated`}
            />
          </label>
        </p>
        <p className="hint" style={{ margin: 0 }}>
          The club&rsquo;s own goals, not the home team&rsquo;s — used only to fill in the fixture
          if nobody else has recorded a score.
        </p>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? '…' : 'Confirm it happened'}
          </button>
        </div>
      </form>
    </li>
  );
}
