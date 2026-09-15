'use client';

import { useActionState } from 'react';

import { formatCents } from '../../../web/money.ts';
import {
  OFFICIAL_ROLES, dimensionLabel, roleLabel, type ScheduleRow, type StandingSchedule,
} from '../../../web/fee-schedule-form.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import type { StoredRate } from '../../../data/fees.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { addRateAction, createScheduleAction, removeRateAction } from './actions.ts';

const STANDING_LABEL = {
  'in-force': 'In force',
  future: 'Starts later',
  superseded: 'Superseded',
} as const;

const STANDING_CLASS = {
  'in-force': 'pill pill-ok',
  future: 'pill pill-warn',
  superseded: 'pill',
} as const;

/**
 * Publishing a schedule.
 *
 * "Copy the rates from" is offered first, because it is the ordinary act: a
 * club's rates move by a few dollars at the AGM, and BR115 makes that a new
 * dated version rather than an edit. Retyping twelve cells to change two is
 * how a club ends up editing last season's schedule instead — so the
 * compliant path is the easy one.
 */
export function NewSchedule({ schedules }: { readonly schedules: readonly ScheduleRow[] }) {
  const [result, action, pending] = useActionState(createScheduleAction, IDLE_FORM);
  const withRates = schedules.filter((s) => s.rateCount > 0);

  return (
    <form action={action} className="stack">
      <FormNotice result={result} />

      <p>
        <label htmlFor="effectiveFrom">Starts from</label>
        <input id="effectiveFrom" name="effectiveFrom" type="date" required />
        <span className="hint">
          A game is priced by the schedule in force on the day it was played, so this date is what
          the club is committing to.
        </span>
      </p>

      <p>
        <label htmlFor="note">Note</label>
        <input id="note" name="note" type="text" placeholder="Set at the February AGM" />
      </p>

      {withRates.length > 0 && (
        <p>
          <label htmlFor="copyFrom">Copy the rates from</label>
          <select id="copyFrom" name="copyFrom" defaultValue={withRates[0]?.id}>
            <option value="">Start empty</option>
            {withRates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.effectiveFrom} — {s.rateCount} rate{s.rateCount === 1 ? '' : 's'}
              </option>
            ))}
          </select>
          <span className="hint">
            The schedule copied from is left exactly as it is. That is the point of a dated version:
            what the club owed in May stays what it owed in May.
          </span>
        </p>
      )}

      <p>
        <button type="submit" disabled={pending}>
          {pending ? 'Publishing…' : 'Publish this schedule'}
        </button>
      </p>
    </form>
  );
}

export function ScheduleList({
  schedules,
}: {
  readonly schedules: readonly StandingSchedule[];
}) {
  if (schedules.length === 0) {
    return (
      <p className="hint" style={{ marginBottom: 0 }}>
        No schedule yet. Until one exists with rates in it, a claim for a match finds no rate at all
        and no official can be paid.
      </p>
    );
  }

  return (
    <ul style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
      {schedules.map((s) => (
        <li key={s.id}>
          <a className="button secondary" href={`/registrar/fees?schedule=${s.id}`}>
            {s.effectiveFrom} <span className={STANDING_CLASS[s.standing]}>{STANDING_LABEL[s.standing]}</span>
            <br />
            <span className="hint">
              {s.rateCount} rate{s.rateCount === 1 ? '' : 's'}
              {s.note === null ? '' : ` · ${s.note}`}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function RateTable({
  rates,
  editable,
}: {
  readonly rates: readonly StoredRate[];
  readonly editable: boolean;
}) {
  if (rates.length === 0) {
    return (
      <p className="hint" style={{ marginBottom: 0 }}>
        No rates in this schedule, so it prices nothing.
      </p>
    );
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Official</th>
          <th>Competition</th>
          <th>Classification</th>
          <th>Appointed by</th>
          <th>Pays</th>
          {editable && <th />}
        </tr>
      </thead>
      <tbody>
        {rates.map((r) => (
          <tr key={r.id}>
            <td>{roleLabel(r.role)}</td>
            <td>{dimensionLabel(r.competition)}</td>
            <td>{dimensionLabel(r.classification)}</td>
            <td>{r.appointedBy === null ? 'Either' : r.appointedBy === 'club' ? 'The club' : 'The association'}</td>
            <td>{formatCents(r.amountCents)}</td>
            {editable && (
              <td>
                <RemoveRate rateId={r.id} label={`${roleLabel(r.role)}, ${dimensionLabel(r.competition)}`} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RemoveRate({ rateId, label }: { readonly rateId: string; readonly label: string }) {
  const [result, action, pending] = useActionState(removeRateAction, IDLE_FORM);

  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="rateId" value={rateId} />
      <button type="submit" className="secondary" disabled={pending} aria-label={`Remove the rate for ${label}`}>
        {pending ? '…' : 'Remove'}
      </button>
      {result.status === 'error' && <span className="hint">{result.message}</span>}
    </form>
  );
}

/**
 * One cell of the club's table.
 *
 * Every dimension but the role defaults to *any*, because that is what most
 * clubs mean: one rate per role, for everything. A club that needs more
 * narrows a row; a club that does not never sees the question.
 */
export function AddRate({ scheduleId }: { readonly scheduleId: string }) {
  const [result, action, pending] = useActionState(addRateAction, IDLE_FORM);

  return (
    <form action={action} className="stack">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <FormNotice result={result} />

      <p>
        <label htmlFor="role">This rate is for</label>
        <select id="role" name="role" defaultValue="referee">
          {OFFICIAL_ROLES.map((role) => (
            <option key={role} value={role}>{roleLabel(role)}</option>
          ))}
        </select>
      </p>

      <p>
        <label htmlFor="amount">Pays</label>
        <input id="amount" name="amount" type="text" inputMode="decimal" placeholder="45.00" required />
      </p>

      <p>
        <label htmlFor="competition">Only for this competition</label>
        <input id="competition" name="competition" type="text" placeholder="Leave blank for any" />
        <span className="hint">
          Matched against what was typed on the fixture, trimmed and ignoring case. Spell it the same
          way twice.
        </span>
      </p>

      <p>
        <label htmlFor="classification">Only for this classification</label>
        <input id="classification" name="classification" type="text" placeholder="Leave blank for any" />
      </p>

      <p>
        <label htmlFor="appointedBy">Only when appointed by</label>
        <select id="appointedBy" name="appointedBy" defaultValue="">
          <option value="">Either</option>
          <option value="club">The club</option>
          <option value="association">The association</option>
        </select>
        <span className="hint">Who appointed decides who pays (BR16).</span>
      </p>

      <p>
        <button type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add this rate'}</button>
      </p>
    </form>
  );
}
