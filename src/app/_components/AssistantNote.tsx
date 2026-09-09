import type { ReactNode } from 'react';

/**
 * The Assistant's only surface.
 *
 * **This component is the guardrail.** It renders a draft and exactly two
 * controls — use it, or dismiss it — and there is no prop, variant or
 * escape hatch that lets it commit anything. That is
 * [decision 1](../../../docs/decisions/1_ai-assistant-autonomy-level.md)
 * expressed as a type rather than as a promise: the Assistant is
 * **advisory**, it may draft, summarise, explain and flag, and a human
 * decides and acts.
 *
 * The reason it is shaped this way rather than trusted to reviewers: a
 * component that renders a draft invites the next change to make it
 * *produce* one, and the change after that to add a send button "just for
 * the reminder case". A component that structurally cannot render a
 * committing control cannot acquire one by accident — only by a deliberate
 * edit to this file, which is exactly where the argument belongs.
 *
 * There is no inference behind it yet. Nothing here calls a model.
 */
export function AssistantNote({
  kind,
  children,
  onUse,
  useLabel = 'Read the draft',
}: {
  /** What the Assistant is doing — the honest verb, never "thinking". */
  readonly kind: 'draft' | 'summary' | 'explaining' | 'flagged';
  readonly children: ReactNode;
  /**
   * The form action behind *use this*. It hands the draft to the human —
   * it never dispatches the thing being drafted.
   */
  readonly onUse?: string;
  readonly useLabel?: string;
}) {
  return (
    <aside className="assistant" aria-label={`Assistant — ${kind}`}>
      <p className="assistant-head">
        <span className="assistant-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.4">
            <path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8m0-12.8l-2.8 2.8m-7.2 7.2l-2.8 2.8" />
          </svg>
        </span>
        Assistant &middot; {kind}
      </p>
      <p>{children}</p>
      <div className="assistant-foot">
        {onUse !== undefined && (
          <a className="button" href={onUse}>
            {useLabel}
          </a>
        )}
        <button type="button" className="secondary">
          Dismiss
        </button>
        {/*
          Said on every single one, not once in an onboarding tour. The
          claim only holds if it is where the action is.
        */}
        <span className="never">It never sends &mdash; you do</span>
      </div>
    </aside>
  );
}
