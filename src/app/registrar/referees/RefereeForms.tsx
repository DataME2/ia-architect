'use client';

import { useActionState } from 'react';

import {
  accreditationOn,
  classificationOn,
  rosterFlags,
  type RefereeSummary,
} from '../../../web/referee-view.ts';
import type {
  AvailabilityWindow,
  UnavailabilityRange,
} from '../../../web/availability-view.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { AvailabilityPanel } from './AvailabilityPanel.tsx';
import {
  addRefereeAction,
  recordAccreditationAction,
  recordClassificationAction,
  retireRefereeAction,
} from './actions.ts';

export function AddRefereeForm({
  candidates,
}: {
  readonly candidates: readonly { personId: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(addRefereeAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <fieldset>
        <legend>Add a match official</legend>
        <div className="field">
          <label htmlFor="personId">Who</label>
          <select id="personId" name="personId" defaultValue="" required>
            <option value="" disabled>
              Choose a person
            </option>
            {candidates.map((c) => (
              <option key={c.personId} value={c.personId}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            Anybody on the club&rsquo;s books. They do not need a referee role for the season
            first &mdash; a roster built only from people already marked referee would be empty
            on the day you first build it.
          </p>
        </div>
        <div className="field">
          <label htmlFor="officialNumber">Football Queensland number</label>
          <input id="officialNumber" name="officialNumber" />
          <p className="hint" style={{ margin: '0.3rem 0 0' }}>
            Optional. A MiniRef in their first season may not have one yet.
          </p>
        </div>
        <div className="field">
          <label htmlFor="startedOn">Officiating since</label>
          <input id="startedOn" name="startedOn" type="date" />
        </div>
      </fieldset>
      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add to the roster'}
        </button>
      </div>
    </form>
  );
}

export function ClassificationForm({ referee }: { readonly referee: RefereeSummary }) {
  const [state, formAction, pending] = useActionState(recordClassificationAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <input type="hidden" name="personId" value={referee.personId} />
      <div className="field">
        <label htmlFor={`level-${referee.personId}`}>Classification</label>
        <input
          id={`level-${referee.personId}`}
          name="level"
          required
          placeholder="e.g. Club Based Match Official 4.5"
          list="fq-levels"
        />
        {/*
          A datalist, not a select. Only two levels of the Football Queensland
          pathway are recorded anywhere in this project, so a closed list
          would refuse the real ones — the same reason the column is free
          text.
        */}
        <datalist id="fq-levels">
          <option value="MiniRef 5.0" />
          <option value="Club Based Match Official 4.5" />
        </datalist>
      </div>
      <div className="field">
        <label htmlFor={`from-${referee.personId}`}>Effective from</label>
        <input id={`from-${referee.personId}`} name="effectiveFrom" type="date" required />
        <p className="hint" style={{ margin: '0.3rem 0 0' }}>
          The date they became this, not the date you are typing. Eligibility for a match is
          judged on the day it was played.
        </p>
      </div>
      <label className="field" style={{ flexDirection: 'row', gap: '0.5rem' }}>
        <input type="checkbox" name="sighted" />
        <span>I have checked this against the register</span>
      </label>
      <div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Record classification'}
        </button>
      </div>
    </form>
  );
}

export function AccreditationForm({ referee }: { readonly referee: RefereeSummary }) {
  const [state, formAction, pending] = useActionState(recordAccreditationAction, IDLE_FORM);

  return (
    <form action={formAction} className="stack">
      <FormNotice result={state} />
      <input type="hidden" name="personId" value={referee.personId} />
      <div className="field">
        <label htmlFor={`kind-${referee.personId}`}>Accreditation</label>
        <input
          id={`kind-${referee.personId}`}
          name="kind"
          required
          placeholder="e.g. fitness, laws of the game"
        />
      </div>
      <div className="field">
        <label htmlFor={`ident-${referee.personId}`}>Reference</label>
        <input id={`ident-${referee.personId}`} name="identifier" />
      </div>
      <div className="field">
        <label htmlFor={`iss-${referee.personId}`}>Issued</label>
        <input id={`iss-${referee.personId}`} name="issuedOn" type="date" />
      </div>
      <div className="field">
        <label htmlFor={`exp-${referee.personId}`}>Expires</label>
        <input id={`exp-${referee.personId}`} name="expiresOn" type="date" />
      </div>
      <label className="field" style={{ flexDirection: 'row', gap: '0.5rem' }}>
        <input type="checkbox" name="verified" />
        <span>I have verified this</span>
      </label>
      <div>
        <button type="submit" className="secondary" disabled={pending}>
          {pending ? '…' : 'Record accreditation'}
        </button>
      </div>
    </form>
  );
}

function RetireButton({ referee }: { readonly referee: RefereeSummary }) {
  const [state, formAction, pending] = useActionState(retireRefereeAction, IDLE_FORM);
  if (referee.retiredOn !== null) return null;

  return (
    <form action={formAction} style={{ display: 'inline' }}>
      <input type="hidden" name="personId" value={referee.personId} />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Retire'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

function Flags({ referee, asOf }: { readonly referee: RefereeSummary; readonly asOf: string }) {
  const flags = rosterFlags(referee, asOf);

  // An empty list means nothing is wrong, and it says so — a blank cell
  // could equally mean nobody has checked.
  if (flags.length === 0) return <span className="pill pill-good">nothing outstanding</span>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {flags.map((flag, i) => {
        const key = `${flag.kind}-${i}`;
        if (flag.kind === 'retired')
          return (
            <span className="pill" key={key}>
              retired {flag.on}
            </span>
          );
        if (flag.kind === 'no-classification')
          return (
            <span className="pill pill-warn" key={key}>
              no classification &mdash; cannot judge eligibility
            </span>
          );
        if (flag.kind === 'unverified-classification')
          return (
            <span className="pill pill-warn" key={key}>
              classification unchecked
            </span>
          );
        if (flag.kind === 'expired')
          return (
            <span className="pill pill-warn" key={key}>
              {flag.what} expired
            </span>
          );
        if (flag.kind === 'lapsing')
          return (
            <span className="pill pill-warn" key={key}>
              {flag.what} lapses {flag.on}
            </span>
          );
        return (
          <span className="pill" key={key}>
            {flag.what} unverified
          </span>
        );
      })}
    </div>
  );
}

/**
 * The roster, and each official's record underneath it.
 *
 * One component rather than a list page and a detail page: a club has tens
 * of officials, not hundreds, and the thing a coordinator actually does is
 * scan for what is outstanding and fix it in place.
 */
export function RefereeRoster({
  referees,
  asOf,
  seasonId,
  windows,
  ranges,
}: {
  readonly referees: readonly RefereeSummary[];
  readonly asOf: string;
  readonly seasonId: string | null;
  readonly windows: ReadonlyMap<string, readonly AvailabilityWindow[]>;
  readonly ranges: ReadonlyMap<string, readonly UnavailabilityRange[]>;
}) {
  if (referees.length === 0) {
    return (
      <p className="hint">
        No match officials recorded yet. Adding one lets the platform answer what they are
        qualified for &mdash; which is what every eligibility rule for an appointment reads.
      </p>
    );
  }

  return (
    <>
      {referees.map((referee) => {
        const current = classificationOn(referee.classifications, asOf);
        return (
          <div className="card" key={referee.personId}>
            <h3 style={{ marginTop: 0 }}>
              {referee.name}{' '}
              {referee.officialNumber !== null && (
                <span className="hint mono">{referee.officialNumber}</span>
              )}
            </h3>

            <p style={{ margin: '0 0 0.5rem' }}>
              {current === null ? (
                <span className="hint">No classification recorded.</span>
              ) : (
                <>
                  <strong>{current.level}</strong>{' '}
                  <span className="hint">since {current.effectiveFrom}</span>
                </>
              )}
            </p>

            <Flags referee={referee} asOf={asOf} />

            {referee.classifications.length > 1 && (
              <details className="process-detail" style={{ marginTop: '0.6rem' }}>
                <summary>Classification history</summary>
                <ul>
                  {referee.classifications.map((c) => (
                    <li key={`${c.effectiveFrom}-${c.level}`}>
                      <strong>{c.level}</strong> from {c.effectiveFrom}
                      {c.sightedAt === null && <span className="hint"> &mdash; unchecked</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {referee.accreditations.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Accreditation</th>
                    <th>Expires</th>
                    <th>On {asOf}</th>
                  </tr>
                </thead>
                <tbody>
                  {referee.accreditations.map((a) => {
                    const state = accreditationOn(a, asOf);
                    return (
                      <tr key={`${a.kind}-${a.expiresOn ?? 'none'}`}>
                        <td>
                          {a.kind}
                          {a.identifier !== null && (
                            <>
                              {' '}
                              <span className="hint mono">{a.identifier}</span>
                            </>
                          )}
                        </td>
                        <td>{a.expiresOn ?? <span className="hint">&mdash;</span>}</td>
                        <td>
                          {state.kind === 'valid' && <span className="pill pill-good">valid</span>}
                          {state.kind === 'expired' && <span className="pill pill-warn">expired</span>}
                          {state.kind === 'not-yet' && <span className="pill">not yet held</span>}
                          {state.kind === 'unverified' && <span className="pill">unverified</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {seasonId !== null && (
              <details className="process-detail">
                <summary>When can {referee.name} officiate?</summary>
                <div style={{ marginTop: '0.8rem' }}>
                  <AvailabilityPanel
                    personId={referee.personId}
                    seasonId={seasonId}
                    windows={windows.get(referee.personId) ?? []}
                    ranges={ranges.get(referee.personId) ?? []}
                    asOf={asOf}
                  />
                </div>
              </details>
            )}

            <details className="process-detail">
              <summary>Record something for {referee.name}</summary>
              <div style={{ display: 'grid', gap: '1.2rem', marginTop: '0.8rem' }}>
                <ClassificationForm referee={referee} />
                <AccreditationForm referee={referee} />
                <RetireButton referee={referee} />
              </div>
            </details>
          </div>
        );
      })}
    </>
  );
}
