'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { addTrainingNightsAction } from './actions.ts';

/** A Technical Lead adds a team's training night, once or weekly (#114). */
export function TrainingNightForm({
  clubId,
  teams,
}: {
  readonly clubId: string;
  readonly teams: readonly { readonly id: string; readonly name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addTrainingNightsAction, IDLE_FORM);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <p>
        <label htmlFor="night-team">Team</label>
        <select id="night-team" name="teamId" required defaultValue="">
          <option value="" disabled>
            Choose a team
          </option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </p>
      <div className="academy-row">
        <p>
          <label htmlFor="night-from">First night</label>
          <input id="night-from" name="from" type="date" required />
        </p>
        <p>
          <label htmlFor="night-until">Every week until (optional)</label>
          <input id="night-until" name="until" type="date" />
        </p>
      </div>
      <div className="academy-row">
        <p>
          <label htmlFor="night-starts">Starts</label>
          <input id="night-starts" name="startsAt" type="time" required />
        </p>
        <p>
          <label htmlFor="night-ends">Ends (optional)</label>
          <input id="night-ends" name="endsAt" type="time" />
        </p>
      </div>
      <p>
        <label htmlFor="night-venue">Where (optional)</label>
        <input id="night-venue" name="venue" type="text" maxLength={120} />
      </p>
      <FormNotice result={state} />
      <p style={{ margin: 0 }}>
        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : 'Add training night'}
        </button>
      </p>
    </form>
  );
}
