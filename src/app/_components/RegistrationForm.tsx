'use client';

import { useActionState, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { WizardSteps } from '../../components/ui/WizardSteps.tsx';
import type { SeasonRow } from '../../data/schema.ts';
import { parseRegistrationForm, type FieldError, type GuardianDraft } from '../../web/registration-form.ts';
import {
  EMPTY_FORM_STATE,
  type RegistrationFormState,
} from '../../web/registration-form-state.ts';
import {
  WIZARD_STEPS,
  errorsForStep,
  firstStepWithError,
  stepOfField,
  reviewLines,
  type ReviewLine,
} from '../../web/registration-wizard.ts';
import { todayIn } from '../../web/today.ts';

/**
 * Shared by the registrar-assisted form and the public invitation link.
 *
 * Both collect exactly the same thing, and they must keep collecting exactly
 * the same thing — a public flow that quietly asked for less would produce
 * registrations the registrar then has to chase, which is the loop this
 * slice exists to close. They differ only in who submits and where the
 * season comes from.
 *
 * **In steps since scope 91, and still one form.** Every field stays in the
 * one `<form>` (a hidden step's fields still submit), the one action
 * receives them, and "Next" checks a step with the same
 * `parseRegistrationForm` the server runs, showing only that step's errors.
 * Errors the server sends back open the first step that holds one.
 */
export type RegistrationAction = (
  state: RegistrationFormState,
  formData: FormData,
) => Promise<RegistrationFormState>;

function Field({
  errors,
  name,
  label,
  hint,
  type = 'text',
  autoComplete,
  defaultValue,
}: {
  readonly errors: readonly FieldError[];
  readonly name: string;
  readonly label: string;
  readonly hint?: string;
  readonly type?: string;
  readonly autoComplete?: string;
  readonly defaultValue?: string | undefined;
}) {
  const error = errors.find((e) => e.field === name)?.message ?? null;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
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

/** Everything typed so far, as the parser takes it. */
function valuesOf(form: HTMLFormElement | null): Record<string, string> {
  const values: Record<string, string> = {};
  if (form === null) return values;
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === 'string') values[key] = value;
  }
  return values;
}

export function RegistrationForm({
  action,
  seasons,
  token,
  utm,
}: {
  readonly action: RegistrationAction;
  /** Omitted on the public link — the invitation already names the season. */
  readonly seasons?: readonly SeasonRow[];
  readonly token?: string;
  /** A partner's UTM pair (BR172), carried to the action so the registration is credited. */
  readonly utm?: { readonly source: string; readonly campaign: string } | null;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  // Carried across siblings. Most MiniRoos families have more than one child,
  // and making a parent retype their own details per child is the re-keying
  // this whole flow exists to remove. The guardian is matched server-side on
  // email, so the second child attaches to the *same* Person (BR80) rather
  // than to a copy.
  const [sibling, setSibling] = useState<GuardianDraft | null>(null);
  // Remounts the form so every field resets to its default — the child's
  // details must NOT carry over, only the guardian's.
  const formKey = sibling === null ? 'first' : `sibling-${sibling.email ?? sibling.legalName.familyName}`;

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [stepErrors, setStepErrors] = useState<readonly FieldError[]>([]);
  const [review, setReview] = useState<readonly ReviewLine[]>([]);
  // The server's errors, until the step holding each passes the check again.
  const [serverErrors, setServerErrors] = useState<readonly FieldError[]>([]);
  const shownStep = useRef(0);
  const last = WIZARD_STEPS.length - 1;
  // Inline, not the `hidden` attribute: globals.css gives `fieldset` and
  // `.stack` a display that would override it. A hidden step still submits.
  const shown = (i: number) => (step === i ? undefined : { display: 'none' as const });

  // The server's errors open the first step that holds one.
  useEffect(() => {
    if (state.status !== 'error') return;
    setServerErrors(state.errors);
    const first = firstStepWithError(state.errors);
    if (first !== null) setStep(first);
  }, [state]);

  // A step change moves focus to its heading, so a screen reader hears where it is.
  useEffect(() => {
    if (shownStep.current !== step) headingRef.current?.focus();
    shownStep.current = step;
  }, [step]);

  const errors: readonly FieldError[] = [...stepErrors, ...serverErrors];
  const errorSteps = [...new Set(errors.map((e) => WIZARD_STEPS.findIndex((s) => s.fields.includes(e.field))))].filter(
    (i) => i >= 0,
  );

  const goTo = (target: number) => {
    if (target === last) setReview(reviewLines(valuesOf(formRef.current)));
    setStepErrors([]);
    setStep(target);
    setReached((r) => Math.max(r, target));
  };

  const next = () => {
    const parsed = parseRegistrationForm(valuesOf(formRef.current), { today: todayIn() });
    const mine = parsed.ok ? [] : errorsForStep(parsed.errors, step);
    if (mine.length > 0) {
      setStepErrors(mine);
      return;
    }
    setServerErrors((prev) => prev.filter((e) => stepOfField(e.field) !== step));
    goTo(step + 1);
  };

  // Enter in a field moves to the next step; only the last step submits.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && step < last && (event.target as HTMLElement).tagName === 'INPUT') {
      event.preventDefault();
      next();
    }
  };

  // `sibling` set means the family pressed "register another child", so the
  // form is shown again even though the last submission succeeded.
  if (state.status === 'done' && sibling === null) {
    const guardian = state.guardian;
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

        {guardian !== null && (
          <>
            <h4 style={{ marginBottom: '0.3rem' }}>Another child to register?</h4>
            <p className="hint" style={{ marginTop: 0 }}>
              We already have your details as <strong>{guardian.legalName.givenNames}{' '}
              {guardian.legalName.familyName}</strong>. Start the next one and you will only fill in the
              child&rsquo;s part.
            </p>
            <button
              type="button"
              onClick={() => {
                setSibling(guardian);
                setStep(0);
                setReached(0);
              }}
            >
              Register another child
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="stack" key={formKey} ref={formRef} onKeyDown={onKeyDown} noValidate>
      {token !== undefined && <input type="hidden" name="token" value={token} />}
      {utm != null && <input type="hidden" name="utmSource" value={utm.source} />}
      {utm != null && <input type="hidden" name="utmCampaign" value={utm.campaign} />}

      <WizardSteps
        steps={WIZARD_STEPS}
        current={step}
        reached={reached}
        errorSteps={errorSteps}
        onSelect={(i) => (i <= reached ? goTo(i) : undefined)}
      />

      {/* Focus lands here on a step change; the legend below is what is seen. */}
      <h3 ref={headingRef} tabIndex={-1} className="sr-only">
        Step {step + 1}: {WIZARD_STEPS[step]?.label}
      </h3>

      {sibling !== null && (
        <p className="notice">
          Registering another child for <strong>{sibling.legalName.givenNames} {sibling.legalName.familyName}</strong>.
          Your details are filled in below — the club will hold you as one person, not one per
          child (BR80).
        </p>
      )}

      {state.status === 'error' && state.message !== null && (serverErrors.length > 0 || state.errors.length === 0) && (
        <div className="errors">
          <strong>{state.message}</strong>
          {serverErrors.length > 0 && (
            <ul>
              {serverErrors.map((e) => (
                <li key={e.field}>{e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <fieldset style={shown(0)}>
        <legend>The player</legend>

        <p className="hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Enter the name exactly as it appears on the passport or birth certificate. This is the
          single most common reason a registration is rejected and has to start again — a
          nickname here costs weeks, and can cost the start of the season.
        </p>

        <Field
          errors={errors}
          name="legalGivenNames"
          label="Legal given names"
          hint="As written on the document — for example Alexandra Marie, not Alex."
          autoComplete="given-name"
        />
        <Field errors={errors} name="legalFamilyName" label="Legal family name" autoComplete="family-name" />
        <Field
          errors={errors}
          name="preferredName"
          label="What should we call them? (optional)"
          hint="Used by coaches, team lists and messages. Never sent to the governing body."
          autoComplete="nickname"
        />
        <Field errors={errors} name="dateOfBirth" label="Date of birth" type="date" />
        <Field errors={errors} name="email" label="Player's email (optional)" type="email" autoComplete="email" />
      </fieldset>

      <fieldset style={shown(1)}>
        <legend>Parent or guardian</legend>
        <p className="hint" style={{ marginTop: 0, marginBottom: '1rem' }}>
          Required for anyone under 18. Leave blank for an adult player.
        </p>
        <Field errors={errors} name="guardianGivenNames" label="Given names" defaultValue={sibling?.legalName.givenNames} />
        <Field errors={errors} name="guardianFamilyName" label="Family name" defaultValue={sibling?.legalName.familyName} />
        <Field errors={errors} name="guardianEmail" label="Email" type="email" defaultValue={sibling?.email ?? undefined} />
      </fieldset>

      <fieldset style={shown(2)}>
        <legend>Permissions</legend>

        <div className="check">
          <input type="checkbox" id="consentCollectionNotice" name="consentCollectionNotice" />
          <label htmlFor="consentCollectionNotice">
            <strong>I have read the collection notice</strong> and agree to the club holding
            these details for registration. Required — the club cannot register a player
            without it, and it can be withdrawn later.
          </label>
        </div>
        {errors.some((e) => e.field === 'consentCollectionNotice') && (
          <p className="hint" style={{ color: 'var(--stop-text)', fontWeight: 600 }}>
            {errors.find((e) => e.field === 'consentCollectionNotice')?.message}
          </p>
        )}

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

      {/* Scope 39. A club's referees are mostly its own players and their
          parents, and nothing ever asked. What this captures is a *claim*
          (BR136) — a coordinator checks it before it becomes anything. */}
      <div style={shown(3)} className="stack">
        <fieldset>
          <legend>Match officiating &mdash; optional</legend>
          <p className="hint">
            Clubs run short of referees every season, and most referees start as players or parents.
            Answering these changes nothing about this registration.
          </p>

          <div className="check">
            <input type="checkbox" id="wantsToOfficiate" name="wantsToOfficiate" />
            <label htmlFor="wantsToOfficiate">
              Interested in officiating for the club. <strong>No experience needed</strong> — the club
              will be in touch about training.
            </label>
          </div>

          <div className="check">
            <input type="checkbox" id="hasOfficiatedBefore" name="hasOfficiatedBefore" />
            <label htmlFor="hasOfficiatedBefore">Has officiated matches before.</label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 12rem' }}>
              <label htmlFor="accreditationNumber">Accreditation number</label>
              <input id="accreditationNumber" name="accreditationNumber" />
            </div>
            <div className="field" style={{ flex: '1 1 10rem' }}>
              <label htmlFor="accreditationLevel">Accreditation level</label>
              <input id="accreditationLevel" name="accreditationLevel" placeholder="Level 4, MiniRef…" />
            </div>
          </div>
          <p className="hint">
            Only needed if they have officiated before. The club checks these against the register
            before they count towards anything &mdash; nothing here appoints anybody.
          </p>
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
      </div>

      <div style={shown(last)} className="stack">
        <section className="card" aria-label="Check what you entered">
          <p className="hint" style={{ marginTop: 0 }}>
            Check it against the passport or birth certificate before you submit. Go back to any step to change it.
          </p>
          <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(9rem, max-content) 1fr', gap: '0.3rem 1rem', margin: 0 }}>
            {review.map((l) => (
              <div key={l.label} style={{ display: 'contents' }}>
                <dt className="hint">{l.label}</dt>
                <dd style={{ margin: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>{l.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card" aria-labelledby="documents-heading">
          <h4 id="documents-heading" style={{ marginTop: 0 }}>
            Documents the club will ask for
          </h4>
          <ul className="check" style={{ margin: 0 }}>
            <li>
              <span className="ctitle">Proof of the legal name and date of birth</span>
              <br />
              <span className="cnote">A birth certificate or passport, matching the name above exactly (BR55).</span>
            </li>
            <li>
              <span className="ctitle">Any voucher you hold</span>
              <br />
              <span className="cnote">A government sport voucher reduces the fee once the treasurer verifies it (BR78).</span>
            </li>
            <li>
              <span className="ctitle">Anything else this season requires</span>
              <br />
              <span className="cnote">The club lists it after you submit, and tells you how to send each one.</span>
            </li>
          </ul>
          <p className="hint" style={{ marginBottom: 0 }}>
            Nothing is uploaded on this page: the link works without an account. Once the club sets up your family
            workspace, you can upload documents there.
          </p>
        </section>
      </div>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        {step > 0 && (
          <button type="button" className="secondary" onClick={() => goTo(step - 1)}>
            Back
          </button>
        )}
        {/* Separate keys: reusing one node and switching it to type="submit"
            mid-click would submit the form from the step before the review. */}
        {step < last ? (
          <button key="next" type="button" onClick={next}>
            Next: {WIZARD_STEPS[step + 1]?.label}
          </button>
        ) : (
          <button key="submit" type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Submit registration'}
          </button>
        )}
      </div>
    </form>
  );
}
