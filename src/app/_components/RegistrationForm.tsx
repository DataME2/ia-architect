'use client';

import { useActionState } from 'react';

import type { SeasonRow } from '../../data/schema.ts';
import {
  EMPTY_FORM_STATE,
  type RegistrationFormState,
} from '../../web/registration-form-state.ts';

/**
 * Shared by the registrar-assisted form and the public invitation link.
 *
 * Both collect exactly the same thing, and they must keep collecting exactly
 * the same thing — a public flow that quietly asked for less would produce
 * registrations the registrar then has to chase, which is the loop this
 * slice exists to close. They differ only in who submits and where the
 * season comes from.
 */
export type RegistrationAction = (
  state: RegistrationFormState,
  formData: FormData,
) => Promise<RegistrationFormState>;

function errorFor(state: RegistrationFormState, field: string): string | null {
  return state.errors.find((e) => e.field === field)?.message ?? null;
}

function Field({
  state,
  name,
  label,
  hint,
  type = 'text',
  autoComplete,
}: {
  readonly state: RegistrationFormState;
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly type?: string;
  readonly autoComplete?: string;
}) {
  const error = errorFor(state, name);
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-describedby={hint ? `${name}-hint` : undefined}
        aria-invalid={error !== null}
      />
      {hint && (
        <p className="hint" id={`${name}-hint`}>
          {hint}
        </p>
      )}
      {error !== null && (
        <p className="hint" style={{ color: 'var(--stop-text)', fontWeight: 600 }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function RegistrationForm({
  action,
  seasons,
  token,
}: {
  readonly action: RegistrationAction;
  /** Omitted on the public link — the invitation already names the season. */
  readonly seasons?: readonly SeasonRow[];
  readonly token?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  if (state.status === 'done') {
    return (
      <section className="card">
        <h3 style={{ marginTop: 0 }}>Registration received</h3>
        {state.outstanding.length === 0 ? (
          <p>
            Everything the club needs is here. It will be included in the next submission to the
            governing body.
          </p>
        ) : (
          <>
            <p>Saved. These are still outstanding before it can be submitted:</p>
            <ul className="rules">
              {state.outstanding.map((o) => (
                <li key={o.ruleId}>
                  <span className="rule-id">{o.ruleId}</span>
                  <span>{o.message}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="notice" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
          Being registered with the club is not the same as being registered to play. The
          governing body confirms that separately, and until it does the player cannot take the
          field (BR43).
        </p>
      </section>
    );
  }

  return (
    <form action={formAction} className="stack">
      {token !== undefined && <input type="hidden" name="token" value={token} />}

      {state.status === 'error' && state.message !== null && (
        <div className="errors">
          <strong>{state.message}</strong>
          {state.errors.length > 0 && (
            <ul>
              {state.errors.map((e) => (
                <li key={e.field}>{e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset>
        <legend>The player</legend>

        <p className="hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Enter the name exactly as it appears on the passport or birth certificate. This is the
          single most common reason a registration is rejected and has to start again — a
          nickname here costs weeks, and can cost the start of the season.
        </p>

        <Field
          state={state}
          name="legalGivenNames"
          label="Legal given names"
          hint="As written on the document — for example Alexandra Marie, not Alex."
          autoComplete="given-name"
        />
        <Field
          state={state}
          name="legalFamilyName"
          label="Legal family name"
          autoComplete="family-name"
        />
        <Field
          state={state}
          name="preferredName"
          label="What should we call them? (optional)"
          hint="Used by coaches, team lists and messages. Never sent to the governing body."
          autoComplete="nickname"
        />
        <Field state={state} name="dateOfBirth" label="Date of birth" type="date" />
        <Field
          state={state}
          name="email"
          label="Player's email (optional)"
          type="email"
          autoComplete="email"
        />
      </fieldset>

      <fieldset>
        <legend>Parent or guardian</legend>
        <p className="hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Required for anyone under 18. Leave blank for an adult player.
        </p>
        <Field state={state} name="guardianGivenNames" label="Given names" />
        <Field state={state} name="guardianFamilyName" label="Family name" />
        <Field state={state} name="guardianEmail" label="Email" type="email" />
      </fieldset>

      <fieldset>
        <legend>Permissions</legend>

        <div className="check">
          <input type="checkbox" id="consentCollectionNotice" name="consentCollectionNotice" />
          <label htmlFor="consentCollectionNotice">
            <strong>I have read the collection notice</strong> and agree to the club holding
            these details for registration. Required — the club cannot register a player
            without it, and it can be withdrawn later.
          </label>
        </div>

        <div className="check">
          <input type="checkbox" id="consentPhotograph" name="consentPhotograph" />
          <label htmlFor="consentPhotograph">
            The club may hold an identification photograph, used only so an official can
            recognise the player on match day. Optional.
          </label>
        </div>

        <div className="check">
          <input type="checkbox" id="consentPublicity" name="consentPublicity" />
          <label htmlFor="consentPublicity">
            The club may use the player&rsquo;s image in social media and promotional material.
            <strong> Entirely optional</strong> — saying no never delays or affects the
            registration, and it can be withdrawn at any time.
          </label>
        </div>
      </fieldset>

      {seasons !== undefined && (
        <fieldset>
          <legend>Season</legend>
          <div className="field">
            <label htmlFor="seasonId">Registering for</label>
            <select id="seasonId" name="seasonId" defaultValue={seasons[0]?.id ?? ''}>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      <div>
        <button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Submit registration'}
        </button>
      </div>
    </form>
  );
}
