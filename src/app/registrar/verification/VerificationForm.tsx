'use client';

import { useActionState, useState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import type { VerifiableAppointment } from '../../../web/claim-view.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { verifyAppointmentAction } from './actions.ts';

const ROLE_LABEL: Readonly<Record<string, string>> = {
  referee: 'Referee',
  assistant_referee: 'Assistant referee',
  fourth_official: 'Fourth official',
};

/**
 * One row: did this official officiate, and — for an abandoned match —
 * why not, or why it ended early.
 *
 * The explanation field only appears once the fixture is known to be
 * abandoned, so an ordinary played match is one click. BR119 needs no
 * warning here beyond what the trigger already refuses: the coordinator
 * signed in now is whoever the database will credit as the verifier.
 */
export function VerificationRow({ appointment }: { readonly appointment: VerifiableAppointment }) {
  const [result, action, pending] = useActionState(verifyAppointmentAction, IDLE_FORM);
  const [officiated, setOfficiated] = useState(true);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="appointmentId" value={appointment.appointmentId} />
      <input type="hidden" name="fixtureStatus" value={appointment.fixtureStatus} />

      <p style={{ margin: 0 }}>
        <b>
          {ROLE_LABEL[appointment.role] ?? appointment.role} &mdash; {appointment.officialName}
        </b>
        <br />
        <span className="hint">
          {appointment.opponent}, {appointment.playedOn}
          {appointment.fixtureStatus !== 'played' && ` (${appointment.fixtureStatus})`}
        </span>
        {appointment.verifierIsOfficial && (
          <>
            <br />
            <span className="hint">
              You are signed in as this official &mdash; somebody else has to verify this one (BR119).
            </span>
          </>
        )}
      </p>

      <p className="row" style={{ margin: 0, gap: '1rem' }}>
        <label>
          <input
            type="radio" name="officiated" value="yes" checked={officiated}
            onChange={() => setOfficiated(true)} disabled={appointment.verifierIsOfficial}
          />{' '}
          Officiated
        </label>
        <label>
          <input
            type="radio" name="officiated" value="no" checked={!officiated}
            onChange={() => setOfficiated(false)} disabled={appointment.verifierIsOfficial}
          />{' '}
          Did not officiate
        </label>
      </p>

      {appointment.fixtureStatus === 'abandoned' && officiated && (
        <p>
          <label htmlFor={`note-${appointment.appointmentId}`}>Why was it abandoned?</label>
          <input
            id={`note-${appointment.appointmentId}`}
            name="abandonmentNote"
            type="text"
            required
            placeholder="Lightning, called off at half time."
          />
        </p>
      )}

      <FormNotice result={result} />

      <p style={{ margin: 0 }}>
        <button type="submit" disabled={pending || appointment.verifierIsOfficial}>
          {pending ? 'Recording…' : 'Record'}
        </button>
      </p>
    </form>
  );
}
