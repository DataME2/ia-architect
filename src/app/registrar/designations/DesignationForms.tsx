'use client';

import { useActionState } from 'react';

import {
  needsOverride,
  type Assessment,
  type Candidate,
} from '../../../domain/officiating/conflicts.ts';
import type { DesignationFixture } from '../../../data/officiating.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { FormNotice } from '../_components/FormNotice.tsx';
import { proposeDesignationAction, withdrawDesignationAction } from './actions.ts';

const ROLE_LABEL: Record<string, string> = {
  referee: 'Referee',
  assistant_referee: 'Assistant referee',
  fourth_official: 'Fourth official',
};

function Warnings({ assessment }: { readonly assessment: Assessment }) {
  if (assessment.warnings.length === 0) {
    return <span className="pill pill-good">nothing against them</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {assessment.warnings.map((w, i) => (
        <span className="pill pill-warn" key={`${w.rule}-${i}`}>
          {w.rule !== '—' && <strong style={{ marginRight: '0.3rem' }}>{w.rule}</strong>}
          {w.message}
        </span>
      ))}
    </div>
  );
}

function ProposeForm({
  fixture,
  candidate,
  assessment,
}: {
  readonly fixture: DesignationFixture;
  readonly candidate: Candidate;
  readonly assessment: Assessment;
}) {
  const [state, formAction, pending] = useActionState(proposeDesignationAction, IDLE_FORM);
  const override = needsOverride(assessment);

  return (
    <form action={formAction} className="stack" style={{ gap: '0.4rem' }}>
      <input type="hidden" name="fixtureId" value={fixture.fixtureId} />
      <input type="hidden" name="personId" value={candidate.personId} />
      <input type="hidden" name="name" value={candidate.name} />
      {/*
        What the coordinator was actually shown, carried back so the audit
        records the warnings they saw rather than what the rules would say
        when somebody reads the log months later.
      */}
      <input
        type="hidden"
        name="overrode"
        value={
          override
            ? assessment.warnings
                .filter((w) => w.rule !== '—')
                .map((w) => `${w.rule}: ${w.message}`)
                .join('|')
            : ''
        }
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
        <select name="role" defaultValue="referee" aria-label={`Role for ${candidate.name}`}>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/*
          BR114 — stored, never inferred from the grade. The club-backup
          case makes the same fixture payable by a different party
          depending on who ended up filling it, so this is a question the
          coordinator answers rather than one the platform guesses.
        */}
        <select
          name="appointedBy"
          defaultValue="club"
          aria-label={`Who is appointing ${candidate.name}`}
        >
          <option value="club">Appointed by the club</option>
          <option value="association">Appointed by the association</option>
        </select>

        <button type="submit" className={override ? 'secondary' : undefined} disabled={pending}>
          {pending ? '…' : override ? 'Designate anyway' : 'Designate'}
        </button>
      </div>

      {override && (
        <span className="hint">
          This will be recorded as an override against your name (BR11).
        </span>
      )}
      <FormNotice result={state} />
    </form>
  );
}

function WithdrawForm({
  fixture,
  personId,
  name,
}: {
  readonly fixture: DesignationFixture;
  readonly personId: string;
  readonly name: string;
}) {
  const [state, formAction, pending] = useActionState(withdrawDesignationAction, IDLE_FORM);

  return (
    <form action={formAction} style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
      <input type="hidden" name="fixtureId" value={fixture.fixtureId} />
      <input type="hidden" name="personId" value={personId} />
      <input
        name="reason"
        placeholder="Why?"
        aria-label={`Reason for withdrawing ${name}`}
        required
      />
      <button type="submit" className="secondary" disabled={pending}>
        {pending ? '…' : 'Withdraw'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

export function DesignationBoard({
  fixture,
  offered,
  hiddenCount,
}: {
  readonly fixture: DesignationFixture;
  readonly offered: readonly { candidate: Candidate; assessment: Assessment }[];
  readonly hiddenCount: number;
}) {
  return (
    <>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Already designated</h3>
        {fixture.appointed.length === 0 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            Nobody yet.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Official</th>
                <th>Role</th>
                <th>State</th>
                <th>Appointed by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fixture.appointed.map((a) => (
                <tr key={a.personId}>
                  <td>{a.name}</td>
                  <td>{ROLE_LABEL[a.role] ?? a.role}</td>
                  <td>
                    <span className="pill">{a.state}</span>
                  </td>
                  <td>
                    {a.appointedBy === 'association' ? 'the association' : 'the club'}
                    <br />
                    <span className="hint">and therefore pays (BR16)</span>
                  </td>
                  <td>
                    {a.state !== 'withdrawn' && (
                      <WithdrawForm
                        fixture={fixture}
                        personId={a.personId}
                        name={a.name}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Who can take it</h3>
        {offered.length === 0 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            Nobody on the roster can be designated to this fixture.
            {hiddenCount > 0 && (
              <>
                {' '}
                {hiddenCount} {hiddenCount === 1 ? 'official is' : 'officials are'} not shown
                because a rule refuses them.
              </>
            )}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Official</th>
                <th>Classification</th>
                <th>Worth knowing</th>
                <th>Designate</th>
              </tr>
            </thead>
            <tbody>
              {offered.map(({ candidate, assessment }) => (
                <tr key={candidate.personId}>
                  <td>{candidate.name}</td>
                  <td>
                    {candidate.classification ?? <span className="hint">&mdash;</span>}
                  </td>
                  <td>
                    <Warnings assessment={assessment} />
                  </td>
                  <td>
                    <ProposeForm
                      fixture={fixture}
                      candidate={candidate}
                      assessment={assessment}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {hiddenCount > 0 && offered.length > 0 && (
          <p className="hint" style={{ marginBottom: 0 }}>
            <strong>
              {hiddenCount} {hiddenCount === 1 ? 'official is' : 'officials are'} not listed.
            </strong>{' '}
            A rule refuses them for this fixture &mdash; they played in it, are in one of its
            teams, are the guardian of somebody who was, are suspended, or are already
            officiating at that time. Not shown rather than shown and refused, because a
            greyed-out name invites somebody to ask why and then find a way round it.
          </p>
        )}
      </div>
    </>
  );
}
