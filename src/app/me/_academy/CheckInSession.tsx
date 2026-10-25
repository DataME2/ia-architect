'use client';

import { useActionState, useState } from 'react';

import type { IsoDate } from '../../../domain/types.ts';
import { addDays } from '../../../web/academy.ts';
import { SESSION_KINDS, rpeLabel, sessionLine, type SessionEntry } from '../../../web/check-in.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { addSessionAction, removeSessionAction } from '../check-in/actions.ts';
import { ScaleChips } from './CheckInForm.tsx';

/** A session the player did: when, what, and how hard (BR186, #109). */
export function SessionForm({ clubId, personId, today }: { readonly clubId: string; readonly personId: string; readonly today: IsoDate }) {
  const [state, formAction, pending] = useActionState(addSessionAction, IDLE_FORM);
  const [rpe, setRpe] = useState<number | null>(null);
  return (
    <form
      action={formAction}
      className="ci-card stack"
      onChange={(e) => {
        const input = e.target;
        if (input instanceof HTMLInputElement && input.name === 'rpe') setRpe(Number(input.value));
      }}
    >
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="personId" value={personId} />
      <h3>Add a session</h3>
      <label className="ci-field">
        <span className="mono">Date</span>
        <input type="date" name="on" defaultValue={today} min={addDays(today, -7)} max={today} required />
      </label>
      <fieldset className="ci-kinds">
        <legend className="mono">Type</legend>
        <div className="ci-kind-grid">
          {SESSION_KINDS.map((k, i) => (
            <label key={k.key} className="ci-chip">
              <input type="radio" name="kind" value={k.key} defaultChecked={i === 1} required />
              <span>{k.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ScaleChips name="rpe" legend="How hard was it?" low="Very, very easy" high="Maximal" />
      <p className="ci-rpe" aria-live="polite">
        {rpe === null ? 'Tap how hard it felt.' : rpeLabel(rpe)}
      </p>
      <FormNotice result={state} />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? 'Adding…' : '+ Add this session'}
      </button>
    </form>
  );
}

/** One session already entered, with the way to take it back. */
export function SessionRow({ clubId, session }: { readonly clubId: string; readonly session: SessionEntry }) {
  const [state, formAction, pending] = useActionState(removeSessionAction, IDLE_FORM);
  const [kind, rest] = sessionLine(session).split(' · RPE ');
  return (
    <li className="ci-card ci-session">
      <span>
        <b>{kind}</b>
        <span className="mono ci-hint">RPE {rest}</span>
      </span>
      <form action={formAction}>
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="sessionId" value={session.id} />
        <button type="submit" className="secondary ci-remove" disabled={pending} aria-label={`Remove ${sessionLine(session)}`}>
          Remove
        </button>
      </form>
      <FormNotice result={state} />
    </li>
  );
}
