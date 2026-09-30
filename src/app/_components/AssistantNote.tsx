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
  // Styled with the design system's utilities (design-system.css scans this
  // file). no-underline, shadow-none and the important hovers are there
  // because globals.css styles every <a> and <button> more specifically.
  const control =
    'inline-flex items-center justify-center min-h-[44px] px-ds-3 py-ds-1 text-xs rounded-sm no-underline shadow-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2';
  return (
    <aside
      aria-label={`Assistant — ${kind}`}
      className="print:hidden font-sans p-ds-4 mb-ds-4 rounded-DEFAULT border border-accent/50 bg-accent/10 shadow-xs"
    >
      <p className="flex items-center gap-ds-2 m-0 mb-ds-2 text-xs font-bold tracking-wide text-foreground">
        <span
          className="w-5 h-5 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center shrink-0 shadow-xs"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2l2.8 2.8m0-12.8l-2.8 2.8m-7.2 7.2l-2.8 2.8" />
          </svg>
        </span>
        Assistant &middot; {kind}
      </p>
      <div className="text-sm text-foreground leading-normal mb-ds-4">{children}</div>
      <div className="flex flex-wrap items-center gap-ds-2 pt-ds-2 border-t border-accent/20">
        {onUse !== undefined && (
          <a
            href={onUse}
            className={`${control} font-bold bg-accent text-accent-foreground hover:bg-accent-hover! hover:text-accent-foreground! focus-visible:ring-accent`}
          >
            {useLabel}
          </a>
        )}
        <button
          type="button"
          className={`${control} font-medium border border-border bg-surface text-foreground hover:bg-surfaceSubtle! hover:text-foreground! focus-visible:ring-primary`}
        >
          Dismiss
        </button>
        {/*
          Said on every single one, not once in an onboarding tour. The
          claim only holds if it is where the action is.
        */}
        <span className="text-xs text-muted-foreground italic ml-auto">It never sends &mdash; you do</span>
      </div>
    </aside>
  );
}
