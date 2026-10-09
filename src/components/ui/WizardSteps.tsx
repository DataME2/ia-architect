import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A multi-step form's progress (scope 91). Each step reached so far is a
 * button back to it; later steps are shown but not reachable until the
 * current one is complete. A step with an error says so in words, not by
 * colour alone (DESIGN.md Principle 1).
 *
 * Presentational: the parent owns which step is current.
 */
export interface WizardStepsProps {
  readonly steps: readonly { readonly label: string }[];
  readonly current: number;
  /** The furthest step reached; steps up to it may be revisited. */
  readonly reached: number;
  /** Steps holding an error. */
  readonly errorSteps?: readonly number[];
  readonly onSelect: (index: number) => void;
  readonly className?: string;
}

export function WizardSteps({ steps, current, reached, errorSteps = [], onSelect, className }: WizardStepsProps) {
  return (
    <nav aria-label="Registration steps" className={cn('font-sans mb-ds-4', className)}>
      <p className="m-0 mb-ds-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        Step {current + 1} of {steps.length}
      </p>
      <ol className="m-0 p-0 list-none flex flex-wrap gap-ds-2">
        {steps.map((s, i) => {
          const isCurrent = i === current;
          const done = i < current || (i <= reached && i !== current);
          const hasError = errorSteps.includes(i);
          const reachable = i <= reached;
          return (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  // globals.css paints every <button> in the accent; a step is a tab.
                  'min-h-[44px] flex items-center gap-ds-2 px-ds-3 rounded-full border text-left text-xs font-semibold whitespace-nowrap shadow-none transition-colors duration-180',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isCurrent
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary! hover:text-primary-foreground!'
                    : hasError
                      ? 'bg-destructive text-destructive-foreground border-destructive-indicator hover:bg-destructive! hover:text-destructive-foreground!'
                      : reachable
                        ? 'bg-surface text-foreground border-border-strong hover:bg-surfaceSubtle! hover:text-foreground!'
                        : 'bg-surface text-muted border-border',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full font-mono text-[10px]',
                    isCurrent ? 'bg-primary-foreground text-primary' : done ? 'bg-success-indicator text-white' : 'bg-secondary text-muted',
                  )}
                >
                  {done && !hasError ? '✓' : i + 1}
                </span>
                <span>
                  {s.label}
                  {hasError && <span className="font-normal"> · needs attention</span>}
                  {!hasError && done && !isCurrent && <span className="sr-only"> (done)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
