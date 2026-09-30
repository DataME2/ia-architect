import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill, type StatusPillVariant } from './StatusPill';

export interface RuleOutcome {
  /**
   * Domain business rule code (e.g. "BR1", "BR60", "BR148").
   */
  ruleId: string;
  /**
   * Outcome evaluation result.
   */
  status: 'pass' | 'fail' | 'ok' | 'blocked' | 'warn' | 'cleared' | 'pending';
  /**
   * Concise business requirement outcome description.
   */
  message: string;
  /**
   * Optional extended policy context or resolution instructions.
   */
  details?: string;
}

// `title` is the list heading (any node), not the HTML tooltip string.
export interface RuleListProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Collection of business rule compliance outcome evaluations.
   */
  outcomes: readonly RuleOutcome[];
  /**
   * Optional header title for the rule outcome list.
   */
  title?: React.ReactNode;
  /**
   * Custom message shown when the outcomes collection is empty.
   */
  emptyMessage?: React.ReactNode;
  /**
   * Controls list item density.
   * @default 'md'
   */
  density?: 'compact' | 'md' | 'comfortable';
}

function mapRuleStatusToVariant(status: RuleOutcome['status']): StatusPillVariant {
  switch (status) {
    case 'pass':
    case 'ok':
    case 'cleared':
      return 'cleared';
    case 'warn':
    case 'pending':
      return 'pending';
    case 'fail':
    case 'blocked':
    default:
      return 'blocked';
  }
}

export const RuleList = React.forwardRef<HTMLDivElement, RuleListProps>(
  (
    {
      outcomes,
      title,
      emptyMessage,
      density = 'md',
      className,
      ...props
    },
    ref
  ) => {
    if (outcomes.length === 0 && !title && !emptyMessage) {
      return null;
    }

    const itemPadding =
      density === 'compact'
        ? 'p-ds-2'
        : density === 'comfortable'
        ? 'p-ds-4'
        : 'p-ds-3';

    return (
      <div ref={ref} className={cn('w-full font-sans', className)} {...props}>
        {title && (
          <div className="mb-ds-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground tracking-tight">
              {title}
            </h4>
            <span className="text-xs font-mono text-muted-foreground">
              {outcomes.length} {outcomes.length === 1 ? 'rule' : 'rules'}
            </span>
          </div>
        )}

        {outcomes.length === 0 ? (
          <div className="p-ds-4 rounded-sm border border-border bg-surfaceSubtle text-center text-sm text-muted-foreground">
            {emptyMessage ?? 'No business rule evaluations to display.'}
          </div>
        ) : (
          <ul className="flex flex-col gap-ds-2 p-0 m-0 list-none" role="list">
            {outcomes.map((outcome) => {
              const pillVariant = mapRuleStatusToVariant(outcome.status);
              const isPassing = pillVariant === 'cleared';

              return (
                <li
                  key={outcome.ruleId}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-center gap-ds-3 rounded-sm border bg-surface transition-colors duration-180',
                    isPassing ? 'border-border' : 'border-destructive-indicator/40 bg-destructive/10',
                    itemPadding
                  )}
                >
                  <div className="flex items-center gap-ds-2 shrink-0">
                    <span className="font-mono text-xs font-bold px-ds-2 py-0.5 rounded-sm bg-background border border-border-strong text-foreground tracking-wide">
                      {outcome.ruleId}
                    </span>
                    <StatusPill
                      variant={pillVariant}
                      size="sm"
                      label={isPassing ? 'OK' : 'Blocked'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug m-0">
                      {outcome.message}
                    </p>
                    {outcome.details && (
                      <p className="text-xs text-muted-foreground mt-ds-1 m-0">
                        {outcome.details}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
);

RuleList.displayName = 'RuleList';