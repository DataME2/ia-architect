'use client';

import { useActionState, type ReactNode } from 'react';

import { SCALES, type Scores } from '../../../web/check-in.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { saveCheckInAction } from '../check-in/actions.ts';

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * One 1-to-10 scale as ten radio buttons drawn as 44px chips. Native
 * radios: they work without script, by keyboard, and a screen reader reads
 * the scale's name and both ends.
 */
export function ScaleChips({
  name,
  legend,
  low,
  high,
  value,
  required = true,
}: {
  readonly name: string;
  readonly legend: string;
  readonly low: string;
  readonly high: string;
  readonly value?: number | undefined;
  readonly required?: boolean;
}) {
  return (
    <fieldset className="ci-card ci-scale">
      <legend>{legend}</legend>
      <p className="ci-ends mono" aria-hidden="true">
        <span>1 {low}</span>
        <span>10 {high}</span>
      </p>
      <div className="ci-chips">
        {NUMBERS.map((n) => (
          <label key={n} className="ci-chip">
            <input
              type="radio"
              name={name}
              value={n}
              defaultChecked={value === n}
              required={required}
              aria-label={`${legend} ${n}${n === 1 ? `, ${low}` : n === 10 ? `, ${high}` : ''}`}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Today's five answers (BR186). The save button sits in the bar at the foot
 * of the phone screen, outside the form, so the sessions in between can be
 * their own form; `form=` ties the button back to this one.
 */
export function CheckInForm({
  clubId,
  personId,
  scores,
  children,
}: {
  readonly clubId: string;
  readonly personId: string;
  readonly scores: Scores | null;
  readonly children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(saveCheckInAction, IDLE_FORM);
  return (
    <>
      <form id="ci-scores" action={formAction} className="ci-section" aria-labelledby="ci-feel">
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="personId" value={personId} />
        <h2 id="ci-feel">How you feel today</h2>
        <p className="ci-hint">Tap a number from 1 to 10 for each.</p>
        {SCALES.map((s) => (
          <ScaleChips key={s.key} name={s.key} legend={s.label} low={s.low} high={s.high} value={scores?.[s.key]} />
        ))}
      </form>
      {children}
      <footer className="ci-bar">
        <FormNotice result={state} />
        <p className="ci-hint">You can change today&rsquo;s answers until midnight.</p>
        <button type="submit" form="ci-scores" disabled={pending}>
          {pending ? 'Saving…' : 'Save today’s check-in'}
        </button>
      </footer>
    </>
  );
}
