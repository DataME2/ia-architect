import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProcessDetailProps
  extends Omit<React.DetailsHTMLAttributes<HTMLDetailsElement>, 'summary'> {
  /**
   * Title or summary heading text displayed on the toggle summary line.
   */
  summary: React.ReactNode;
  /**
   * Optional business rule citation code (e.g. "BR80", "BR105") displayed in a mono pill tag.
   */
  ruleCode?: React.ReactNode;
  /**
   * Optional secondary hint or meta text rendered on the right side of the summary header.
   */
  meta?: React.ReactNode;
  /**
   * Controlled open state of the collapsible details container.
   */
  open?: boolean;
  /**
   * Uncontrolled initial open state.
   * @default false
   */
  defaultOpen?: boolean;
}

export const ProcessDetail = React.forwardRef<HTMLDetailsElement, ProcessDetailProps>(
  (
    {
      summary,
      ruleCode,
      meta,
      open,
      defaultOpen = false,
      className,
      children,
      onToggle,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState<boolean>(open ?? defaultOpen);

    React.useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);

    const handleToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
      setIsOpen(e.currentTarget.open);
      if (onToggle) {
        onToggle(e);
      }
    };

    return (
      <details
        ref={ref}
        open={isOpen}
        onToggle={handleToggle}
        className={cn(
          'group border border-border rounded-sm bg-surfaceSubtle p-ds-3 text-sm text-muted-foreground transition-all font-sans mb-ds-3 select-none',
          className
        )}
        {...props}
      >
        <summary
          className={cn(
            'cursor-pointer font-medium text-foreground list-none flex items-center justify-between gap-ds-3 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-xs',
            isOpen && 'mb-ds-2 pb-ds-2 border-b border-border'
          )}
        >
          <div className="flex items-center gap-ds-2 min-w-0">
            {/* Custom chevron indicator */}
            <svg
              className={cn(
                'w-4 h-4 shrink-0 transition-transform duration-180 text-muted-foreground group-open:rotate-90'
              )}
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 5l6 5-6 5" />
            </svg>

            {ruleCode && (
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-backgroundSunk text-foreground border border-border shrink-0">
                {ruleCode}
              </span>
            )}

            <span className="truncate">{summary}</span>
          </div>

          {meta && (
            <span className="font-mono text-xs text-muted-foreground/80 shrink-0">
              {meta}
            </span>
          )}
        </summary>

        <div className="mt-ds-2 text-xs sm:text-sm text-muted-foreground leading-normal font-sans space-y-ds-2">
          {children}
        </div>
      </details>
    );
  }
);

ProcessDetail.displayName = 'ProcessDetail';