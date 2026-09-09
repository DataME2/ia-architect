'use client';

import { useActionState } from 'react';

import {
  WEEKDAYS,
  availabilitySummary,
  orderRanges,
  orderWindows,
  overlappingPairs,
  rangeLabel,
  rangeState,
  windowLabel,
  type AvailabilityWindow,
  type UnavailabilityRange,
} from '../../../web/availability-view.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import {
  declareWindowAction,
  recordUnavailabilityAction,
  removeUnavailabilityAction,
  removeWindowAction,
} from './availability-actions.ts';

function RemoveWindow({ windowId }: { readonly windowId: string }) {
  const [state, formAction, pending] = useActionState(removeWindowAction, IDLE_FORM);
  return (
    <form action={formAction} style={{ display: 'inline' }}>
      <input type="hidden" name="windowId" value={windowId} />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Remove'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

function RemoveRange({ rangeId }: { readonly rangeId: string }) {
  const [state, formAction, pending] = useActionState(removeUnavailabilityAction, IDLE_FORM);
  return (
    <form action={formAction} style={{ display: 'inline' }}>
      <input type="hidden" name="rangeId" value={rangeId} />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Remove'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

function DeclareWindowForm({
  personId,
  seasonId,
}: {
  readonly personId: string;
  readonly seasonId: string;
}) {
  const [state, formAction, pending] = useActionState(declareWindowAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
      <FormNotice result={state} />
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <select name="weekday" defaultValue="" aria-label="Day of the week" required>
          <option value="" disabled>
            Which day?
          </option>
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}s
            </option>
          ))}
        </select>
        <input name="fromTime" type="time" aria-label="From" />
        <input name="toTime" type="time" aria-label="Until" />
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Declare'}
        </button>
      </div>
      <span className="hint">
        Leave both times empty for the whole day. One of the two is fine on its own &mdash;
        &ldquo;Saturdays from 14:00&rdquo; is a complete answer.
      </span>
    </form>
  );
}

function UnavailabilityForm({ personId }: { readonly personId: string }) {
  const [state, formAction, pending] = useActionState(recordUnavailabilityAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
      <FormNotice result={state} />
      <input type="hidden" name="personId" value={personId} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <input name="startsOn" type="date" aria-label="Away from" required />
        <input name="endsOn" type="date" aria-label="Away until" required />
        <input name="reason" placeholder="Why? (optional)" aria-label="Reason" />
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Record'}
        </button>
      </div>
      <span className="hint">
        An away period <strong>beats any standing window it covers</strong>, whichever was
        entered first.
      </span>
    </form>
  );
}

/**
 * What one official has said about their season.
 *
 * Two lists rather than one, because they are two different facts stated at
 * different times: what somebody can usually do, and the weekend they
 * cannot. Merging them into a single calendar would be prettier and would
 * lose which is which.
 */
export function AvailabilityPanel({
  personId,
  seasonId,
  windows,
  ranges,
  asOf,
}: {
  readonly personId: string;
  readonly seasonId: string;
  readonly windows: readonly AvailabilityWindow[];
  readonly ranges: readonly UnavailabilityRange[];
  readonly asOf: string;
}) {
  const clashes = overlappingPairs(windows);

  return (
    <div className="stack" style={{ gap: '0.7rem' }}>
      <p style={{ margin: 0 }}>
        {windows.length === 0 ? (
          <span className="pill pill-warn">{availabilitySummary(windows, ranges, asOf)}</span>
        ) : (
          <span className="hint">{availabilitySummary(windows, ranges, asOf)}</span>
        )}
      </p>

      {windows.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {orderWindows(windows).map((w) => (
            <li key={w.id}>
              {windowLabel(w)} <RemoveWindow windowId={w.id} />
            </li>
          ))}
        </ul>
      )}

      {clashes.length > 0 && (
        <p className="hint" style={{ margin: 0 }}>
          <strong>Two windows describe the same hours.</strong> Harmless &mdash; availability is
          the union of them &mdash; but usually a half-finished edit:{' '}
          {clashes.map(([a, b], i) => (
            <span key={`${a.id}-${b.id}`}>
              {i > 0 && '; '}
              {windowLabel(a)} and {windowLabel(b)}
            </span>
          ))}
          .
        </p>
      )}

      <DeclareWindowForm personId={personId} seasonId={seasonId} />

      {ranges.length > 0 && (
        <>
          <p style={{ margin: '0.4rem 0 0', fontWeight: 600 }}>Away</p>
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {orderRanges(ranges, asOf).map((r) => {
              const when = rangeState(r, asOf);
              return (
                <li key={r.id} style={when === 'past' ? { opacity: 0.6 } : undefined}>
                  {rangeLabel(r)}
                  {r.reason !== null && <> &mdash; {r.reason}</>}{' '}
                  {when === 'current' && <span className="pill pill-warn">now</span>}
                  {when === 'past' && <span className="pill">past</span>} <RemoveRange rangeId={r.id} />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <UnavailabilityForm personId={personId} />
    </div>
  );
}
