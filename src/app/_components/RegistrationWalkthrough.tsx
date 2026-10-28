'use client';

import { useState, type CSSProperties } from 'react';

import { WALK_STEPS, nextStep, previousStep } from '../../web/home-story.ts';

/**
 * One registration, step by step (scope 118). The reader chooses the step,
 * from the list or with Previous and Next, and each shows who acts, what is
 * involved, which rules the platform applies, where a person decides, and
 * what follows. It explains the product: it submits, approves and pays
 * nothing.
 *
 * The buttons never become disabled, because a disabled button under the
 * reader's focus drops it to the page. At the first step Previous says
 * there is nothing before it; at the last, Next starts again.
 */
export function RegistrationWalkthrough() {
  const [at, setAt] = useState(0);
  const last = WALK_STEPS.length - 1;
  const step = WALK_STEPS[at];
  if (step === undefined) return null;

  return (
    <div className="wk" style={{ '--wk-progress': at / last } as CSSProperties}>
      <ol className="wk-steps" aria-label="Registration steps">
        {WALK_STEPS.map((s, i) => (
          <li key={s.id} data-state={i < at ? 'done' : i === at ? 'current' : 'todo'}>
            <button type="button" aria-current={i === at ? 'step' : undefined} onClick={() => setAt(i)}>
              <span className="wk-num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="wk-step-title">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <section className="wk-panel" aria-labelledby="wk-title">
        {/* Outside the keyed body, so the announcement is not remounted. */}
        <p className="wk-count" aria-live="polite">
          Step {at + 1} of {WALK_STEPS.length}: {step.title}
        </p>
        {/* Keyed by the step, so its content re-enters with each choice. */}
        <div key={step.id} className="wk-body">
          <div className="wk-head">
            <h3 id="wk-title">{step.title}</h3>
            <span className={`pill pill-${step.status.tone}`}>{step.status.word}</span>
          </div>
          <p className="wk-who">{step.who}</p>

          <div className="wk-cols">
            <div>
              <p className="wk-label">What is involved</p>
              <ul className="wk-involves">
                {step.involves.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="wk-label">What PitchPeople checks</p>
              <ul className="wk-checks">
                {step.checks.map((c) => (
                  <li key={c.br + c.text}>
                    <code>{c.br}</code>
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {step.human && (
            <p className="wk-human">
              <strong>A person decides.</strong> {step.human}
            </p>
          )}
          <p className="wk-next">
            <strong>What happens next.</strong> {step.next}
          </p>
        </div>

        <div className="wk-nav">
          <button
            type="button"
            className="button secondary"
            aria-disabled={at === 0}
            onClick={() => setAt(previousStep(at))}
          >
            Previous step
          </button>
          <button type="button" className="button" onClick={() => setAt(at === last ? 0 : nextStep(at))}>
            {at === last ? 'Start again' : 'Next step'}
          </button>
        </div>
      </section>
    </div>
  );
}
