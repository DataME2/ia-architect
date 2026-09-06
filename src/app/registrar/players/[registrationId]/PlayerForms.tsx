'use client';

import { useActionState } from 'react';

import { IDLE_FORM } from '../../../../web/form-result.ts';
import type { PlayerProfile } from '../../../../domain/performance/types.ts';
import { FormNotice } from '../../_components/FormNotice.tsx';
import { recordAppearanceAction, savePlayerProfileAction } from './actions.ts';

const POSITIONS = [
  ['', '—'],
  ['goalkeeper', 'Goalkeeper'],
  ['defender', 'Defender'],
  ['midfielder', 'Midfielder'],
  ['forward', 'Forward'],
  ['utility', 'Utility'],
] as const;

export function PlayerProfileForm({
  registrationId,
  profile,
}: {
  readonly registrationId: string;
  readonly profile: PlayerProfile | null;
}) {
  const [state, formAction, pending] = useActionState(savePlayerProfileAction, IDLE_FORM);

  return (
    <details className="process-detail">
      <summary>{profile === null ? 'Add player details' : 'Edit player details'}</summary>
      <form action={formAction} className="stack" style={{ marginTop: '0.75rem' }}>
        <FormNotice result={state} />
        <input type="hidden" name="registrationId" value={registrationId} />

        <fieldset>
          <legend>On the pitch</legend>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 9rem' }}>
              <label htmlFor="preferredPosition">Position</label>
              <select
                id="preferredPosition"
                name="preferredPosition"
                defaultValue={profile?.preferredPosition ?? ''}
              >
                {POSITIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: '1 1 9rem' }}>
              <label htmlFor="secondaryPosition">Also plays</label>
              <select
                id="secondaryPosition"
                name="secondaryPosition"
                defaultValue={profile?.secondaryPosition ?? ''}
              >
                {POSITIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: '0 1 7rem' }}>
              <label htmlFor="preferredFoot">Foot</label>
              <select id="preferredFoot" name="preferredFoot" defaultValue={profile?.preferredFoot ?? ''}>
                <option value="">—</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div className="field" style={{ flex: '0 1 6rem' }}>
              <label htmlFor="squadNumber">Squad no.</label>
              <input
                id="squadNumber"
                name="squadNumber"
                inputMode="numeric"
                defaultValue={profile?.squadNumber ?? ''}
              />
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>Measurements</legend>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '0 1 8rem' }}>
              <label htmlFor="heightCm">Height (cm)</label>
              <input id="heightCm" name="heightCm" inputMode="numeric" defaultValue={profile?.heightCm ?? ''} />
            </div>
            <div className="field" style={{ flex: '0 1 8rem' }}>
              <label htmlFor="weightKg">Weight (kg)</label>
              <input id="weightKg" name="weightKg" inputMode="decimal" defaultValue={profile?.weightKg ?? ''} />
            </div>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            <strong>Optional, and recorded for this season only.</strong> These are measurements of
            a child &mdash; kept for equipment sizing, format placement and safety, readable only
            by the people who pick teams, and never required to complete a registration.
          </p>
        </fieldset>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save details'}
          </button>
        </div>
      </form>
    </details>
  );
}

export function AppearanceForm({
  registrationId,
  personId,
  fixtures,
}: {
  readonly registrationId: string;
  readonly personId: string;
  readonly fixtures: readonly { readonly id: string; readonly label: string }[];
}) {
  const [state, formAction, pending] = useActionState(recordAppearanceAction, IDLE_FORM);

  if (fixtures.length === 0) {
    return (
      <p className="hint">
        No fixtures recorded for this season yet, so there is nothing to appear in. Add one on the{' '}
        <a href="/registrar/fixtures">fixtures page</a> first.
      </p>
    );
  }

  return (
    <details className="process-detail">
      <summary>Record an appearance</summary>
      <form action={formAction} className="stack" style={{ marginTop: '0.75rem' }}>
        <FormNotice result={state} />
        <input type="hidden" name="registrationId" value={registrationId} />
        <input type="hidden" name="personId" value={personId} />

        <div className="field">
          <label htmlFor="fixtureId">Fixture</label>
          <select id="fixtureId" name="fixtureId" required>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="field" style={{ flex: '0 1 7rem' }}>
            <label htmlFor="minutes">Minutes</label>
            <input id="minutes" name="minutes" inputMode="numeric" defaultValue="0" />
          </div>
          <div className="field" style={{ flex: '0 1 6rem' }}>
            <label htmlFor="goals">Goals</label>
            <input id="goals" name="goals" inputMode="numeric" defaultValue="0" />
          </div>
          <div className="field" style={{ flex: '0 1 6rem' }}>
            <label htmlFor="assists">Assists</label>
            <input id="assists" name="assists" inputMode="numeric" defaultValue="0" />
          </div>
          <div className="field consent-field" style={{ flex: '1 1 8rem', marginTop: 0 }}>
            <label htmlFor="started" className="consent-label">
              <input id="started" name="started" type="checkbox" defaultChecked />
              <span>Started the match</span>
            </label>
          </div>
        </div>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Recording…' : 'Record appearance'}
          </button>
        </div>
      </form>
    </details>
  );
}
