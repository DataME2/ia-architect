'use client';

import { useActionState } from 'react';

import type { SeasonRow } from '../../../data/schema.ts';
import { DEFAULT_EXPIRY_DAYS, EMPTY_ISSUE_STATE } from '../../../web/invitation-view.ts';
import { issueInvitationAction } from './actions.ts';

export function IssueForm({ seasons }: { readonly seasons: readonly SeasonRow[] }) {
  const [state, formAction, pending] = useActionState(issueInvitationAction, EMPTY_ISSUE_STATE);

  return (
    <>
      {state.error !== null && (
        <div className="errors">
          <strong>{state.error}</strong>
        </div>
      )}

      {state.link !== null && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Copy this now — it is shown once</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            The link for <strong>{state.label}</strong>. Only its fingerprint is stored, so it
            cannot be shown again: if you lose it, revoke it and issue another. Treat it like a
            password — anyone holding it can submit a registration to your club.
          </p>
          <p>
            <input
              type="text"
              readOnly
              value={state.link}
              onFocus={(event) => event.currentTarget.select()}
              aria-label="Registration link"
            />
          </p>
        </section>
      )}

      <form action={formAction} className="stack">
        <fieldset>
          <legend>New registration link</legend>

          <div className="field">
            <label htmlFor="label">What is it for?</label>
            <input id="label" name="label" type="text" required placeholder="e.g. U12s, 2026 season" />
            <p className="hint">Only you see this. It is how you tell your links apart later.</p>
          </div>

          <div className="field">
            <label htmlFor="seasonId">Season</label>
            <select id="seasonId" name="seasonId" defaultValue={seasons[0]?.id ?? ''}>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="expiryDays">Expires after (days)</label>
            <input
              id="expiryDays"
              name="expiryDays"
              type="text"
              inputMode="numeric"
              defaultValue={String(DEFAULT_EXPIRY_DAYS)}
            />
            <p className="hint">
              A registration link outlives its season in a group chat. Shorter is safer; you can
              always issue another.
            </p>
          </div>
        </fieldset>

        <div>
          <button type="submit" disabled={pending}>
            {pending ? 'Creating…' : 'Create link'}
          </button>
        </div>
      </form>
    </>
  );
}
