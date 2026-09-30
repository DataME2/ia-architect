import * as React from 'react';
import { cn } from '@/lib/utils';

export type FormNoticeTone = 'success' | 'error' | 'warning' | 'info';

export interface FormNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * What happened. Success is Eucalyptus, an error Oxide, something still
   * waiting Ochre, a plain fact Deep Reef — DESIGN.md's colour roles.
   */
  tone: FormNoticeTone;
  /** The message itself — one sentence a person can act on. */
  children: React.ReactNode;
}

const toneStyles: Record<FormNoticeTone, { box: string; dot: string }> = {
  success: { box: 'bg-success text-success-foreground border-success-indicator', dot: 'bg-success-indicator' },
  error: { box: 'bg-destructive text-destructive-foreground border-destructive-indicator', dot: 'bg-destructive-indicator' },
  warning: { box: 'bg-warning text-warning-foreground border-warning-indicator', dot: 'bg-warning-indicator' },
  info: { box: 'bg-info text-info-foreground border-info-indicator', dot: 'bg-info-indicator' },
};

/**
 * How a form went. An error is announced at once (`role="alert"`); anything
 * else politely (`role="status"`). The dot beside the text is DESIGN.md's
 * Principle 1 — never state by colour alone.
 */
export const FormNotice = React.forwardRef<HTMLDivElement, FormNoticeProps>(
  ({ tone, children, className, ...props }, ref) => {
    const styles = toneStyles[tone];
    return (
      <div
        ref={ref}
        role={tone === 'error' ? 'alert' : 'status'}
        className={cn(
          'flex items-start gap-ds-2 rounded-sm border border-l-4 px-ds-4 py-ds-3 mb-ds-4 text-sm font-sans',
          styles.box,
          className
        )}
        {...props}
      >
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', styles.dot)} aria-hidden="true" />
        <strong className="font-semibold">{children}</strong>
      </div>
    );
  }
);

FormNotice.displayName = 'FormNotice';
