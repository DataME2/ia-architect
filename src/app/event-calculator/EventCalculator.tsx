'use client';

import Link from 'next/link';
import { useState } from 'react';

import { LINE_PARTICIPANTS, LINE_UNITS, type BreakEvenDriver, type LineParticipants, type LineUnit } from '../../domain/events/economics.ts';
import { CURRENCIES, isCurrency } from '../../domain/finance/currency.ts';
import {
  addLine,
  calculatorView,
  EVENT_TYPE_HINT,
  EVENT_TYPE_LABEL,
  EVENT_TYPES,
  initialState,
  isPerParticipantUnit,
  PARTICIPANTS_LABEL,
  removeLine,
  UNIT_LABEL,
  updateLine,
  type CalculatorState,
  type CalculatorView,
  type EventTypeId,
  type LineDraft,
} from '../../web/event-calculator.ts';

type Shape = 'days' | 'teams' | 'juniors' | 'seniors';
const SHAPE_FIELDS: readonly { key: Shape; label: string }[] = [
  { key: 'days', label: 'Days' },
  { key: 'teams', label: 'Teams' },
  { key: 'juniors', label: 'Junior participants' },
  { key: 'seniors', label: 'Senior participants' },
];

/**
 * The public event calculator's screen (BR222, scope 135). Every number
 * and sentence comes from `calculatorView`; this renders it. The state
 * lives only in this tab: there is no form submission, no server action
 * and no request, so nothing the visitor types leaves their browser.
 */
export function EventCalculator() {
  const [type, setType] = useState<EventTypeId>('carnival');
  const [states, setStates] = useState<Record<EventTypeId, CalculatorState>>(
    () => Object.fromEntries(EVENT_TYPES.map((t) => [t, initialState(t)])) as Record<EventTypeId, CalculatorState>,
  );
  const state = states[type];
  const view = calculatorView(state);
  const update = (next: CalculatorState) => setStates((all) => ({ ...all, [type]: next }));

  return (
    <div className="calc">
      <nav className="paths-tabs" aria-label="Event type">
        {EVENT_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={t === type} onClick={() => setType(t)}>
            <span className="paths-tab-t">{EVENT_TYPE_LABEL[t]}</span>
          </button>
        ))}
      </nav>
      <p className="hint">{EVENT_TYPE_HINT[type]}</p>

      <div className="calc-layout">
        <div className="calc-inputs">
          <fieldset>
            <legend>The event</legend>
            <div className="calc-shape">
              <div className="field">
                <label htmlFor="calc-currency">Currency</label>
                <select
                  id="calc-currency"
                  value={state.currency}
                  onChange={(e) => {
                    const currency = e.target.value;
                    // One currency for the visitor, whichever tab they are on.
                    if (isCurrency(currency)) setStates((all) => mapStates(all, (s) => ({ ...s, currency })));
                  }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c === 'AUD' ? 'Australian dollars (A$)' : 'New Zealand dollars (NZ$)'}
                    </option>
                  ))}
                </select>
              </div>
              {SHAPE_FIELDS.map(({ key, label }) => (
                <div className="field" key={key}>
                  <label htmlFor={`calc-${key}`}>{label}</label>
                  <input
                    id={`calc-${key}`}
                    inputMode="numeric"
                    value={state[key]}
                    aria-invalid={errorsOf(view)[key] !== undefined}
                    onChange={(e) => update({ ...state, [key]: e.target.value })}
                  />
                  {errorsOf(view)[key] && <p className="calc-error">{errorsOf(view)[key]}</p>}
                </div>
              ))}
              <div className="field">
                <label htmlFor="calc-driver">Break even on</label>
                <select
                  id="calc-driver"
                  value={state.driver}
                  onChange={(e) => update({ ...state, driver: e.target.value as BreakEvenDriver })}
                >
                  <option value="participants">Participants</option>
                  <option value="teams">Teams</option>
                </select>
              </div>
            </div>
          </fieldset>

          <LineSection title="Income" direction="revenue" state={state} view={view} update={update} />
          <LineSection title="Costs" direction="expense" state={state} view={view} update={update} />
        </div>

        <section className="calc-results" aria-live="polite" aria-label="Estimate">
          {view.ok ? <Results view={view} /> : <p className="calc-error">Correct the figures marked to see the estimate.</p>}
        </section>
      </div>

      <div className="calc-notes hint">
        <p>
          <strong>An estimate from your own figures</strong> — not a quote, and not financial, tax or legal advice.
          Amounts are as you enter them, GST included or not.
        </p>
        <p>
          <strong>Nothing you type leaves this page.</strong> It is worked out in your browser, and nothing is sent,
          saved or emailed.
        </p>
        <p>
          <strong>Governing-body charges</strong> are yours to enter, from your governing body’s published policy for
          this kind of event. PitchPeople does not fill them in until it holds a verified copy of that policy.
        </p>
        <p>
          Want this as a budget your committee can approve? <Link href="/interest">Talk to us</Link>.
        </p>
      </div>
    </div>
  );
}

function mapStates(
  all: Record<EventTypeId, CalculatorState>,
  f: (s: CalculatorState) => CalculatorState,
): Record<EventTypeId, CalculatorState> {
  return Object.fromEntries(EVENT_TYPES.map((t) => [t, f(all[t])])) as Record<EventTypeId, CalculatorState>;
}

function errorsOf(view: CalculatorView): Readonly<Record<string, string>> {
  return view.ok ? {} : view.errors;
}

function LineSection({
  title,
  direction,
  state,
  view,
  update,
}: {
  title: string;
  direction: 'revenue' | 'expense';
  state: CalculatorState;
  view: CalculatorView;
  update: (next: CalculatorState) => void;
}) {
  const lines = state.lines.filter((l) => l.direction === direction);
  const prefix = state.currency === 'AUD' ? 'A$' : 'NZ$';
  return (
    <fieldset>
      <legend>{title}</legend>
      <ul className="calc-lines">
        {lines.map((line) => (
          <LineRow key={line.id} line={line} prefix={prefix} state={state} view={view} update={update} />
        ))}
      </ul>
      <button type="button" className="ghost" onClick={() => update(addLine(state, direction))}>
        {direction === 'revenue' ? 'Add income' : 'Add a cost'}
      </button>
    </fieldset>
  );
}

function LineRow({
  line,
  prefix,
  state,
  view,
  update,
}: {
  line: LineDraft;
  prefix: string;
  state: CalculatorState;
  view: CalculatorView;
  update: (next: CalculatorState) => void;
}) {
  const error = errorsOf(view)[line.id];
  const computed = view.ok ? view.lines[line.id] : undefined;
  const name = line.label.trim() === '' ? 'this line' : line.label;
  return (
    <li className="calc-line">
      <input
        className="calc-line-name"
        aria-label="Line name"
        value={line.label}
        onChange={(e) => update(updateLine(state, line.id, { label: e.target.value }))}
      />
      <span className="calc-amount calc-line-amount">
        <span aria-hidden="true">{prefix}</span>
        <input
          aria-label={`${name}: amount`}
          inputMode="decimal"
          placeholder="0"
          value={line.amount}
          aria-invalid={error !== undefined}
          onChange={(e) => update(updateLine(state, line.id, { amount: e.target.value }))}
        />
      </span>
      <select
        className="calc-line-unit"
        aria-label={`${name}: charged`}
        value={line.unit}
        onChange={(e) => update(updateLine(state, line.id, { unit: e.target.value as LineUnit }))}
      >
        {LINE_UNITS.map((u) => (
          <option key={u} value={u}>
            {UNIT_LABEL[u]}
          </option>
        ))}
      </select>
      {isPerParticipantUnit(line.unit) ? (
        <select
          className="calc-line-who"
          aria-label={`${name}: who it counts`}
          value={line.participants}
          onChange={(e) => update(updateLine(state, line.id, { participants: e.target.value as LineParticipants }))}
        >
          {LINE_PARTICIPANTS.map((p) => (
            <option key={p} value={p}>
              {PARTICIPANTS_LABEL[p]}
            </option>
          ))}
        </select>
      ) : (
        <span className="calc-line-who" />
      )}
      <span className="calc-line-total">
        {error ? (
          <span className="calc-error">{error}</span>
        ) : computed ? (
          <>
            <strong>{computed.total}</strong> <span className="hint">{computed.working}</span>
          </>
        ) : null}
      </span>
      <button type="button" className="ghost calc-line-remove" aria-label={`Remove ${name}`} onClick={() => update(removeLine(state, line.id))}>
        Remove
      </button>
    </li>
  );
}

function Results({ view }: { view: Extract<CalculatorView, { ok: true }> }) {
  const resultLabel = view.resultKind === 'deficit' ? 'Deficit' : view.resultKind === 'surplus' ? 'Surplus' : 'Breaks even';
  return (
    <>
      <div className="calc-figures">
        <div className="stat">
          <p className="label">Income</p>
          <span className="n">{view.income}</span>
        </div>
        <div className="stat">
          <p className="label">Costs</p>
          <span className="n">{view.costs}</span>
        </div>
        <div className={`stat calc-result-${view.resultKind}`}>
          <p className="label">{resultLabel}</p>
          <span className="n">{view.resultKind === 'even' ? '—' : view.result}</span>
        </div>
      </div>
      <p className="calc-breakeven">{view.breakEven}</p>
      {view.perParticipant && (
        <p className="hint">
          Per participant: {view.perParticipant.income} in, {view.perParticipant.cost} out.
        </p>
      )}

      {view.costRows.length > 0 && (
        <>
          <h3>Where the costs go</h3>
          <ul className="calc-bars">
            {view.costRows.map((r) => (
              <li key={r.label}>
                <span className="calc-bar-label">{r.label}</span>
                <span className="calc-bar-track" aria-hidden="true">
                  <span className="calc-bar-fill" style={{ width: `${r.percent}%` }} />
                </span>
                <span className="calc-bar-amount">
                  {r.amount} <span className="hint">({r.percent}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>If the numbers change</h3>
      <div className="table-wrap">
        <table>
          <caption className="hint">Everything else as you entered it</caption>
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">Surplus or deficit</th>
            </tr>
          </thead>
          <tbody>
            {view.scenarios.map((s) => (
              <tr key={s.label}>
                <th scope="row">
                  {s.label}
                  <span className="hint calc-scenario-size">{s.size}</span>
                </th>
                <td>
                  <strong className={s.deficit ? 'calc-negative' : undefined}>{s.result}</strong>
                  <span className="hint calc-scenario-size">
                    {s.income} in · {s.costs} out
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
