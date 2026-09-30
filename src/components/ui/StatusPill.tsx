import * as React from 'react';
import { cn } from '@/lib/utils';

export type StatusPillVariant =
  | 'cleared'
  | 'ok'
  | 'pass'
  | 'pending'
  | 'warn'
  | 'blocked'
  | 'stop'
  | 'fail'
  | 'info'
  | 'neutral';

export type RegistrationStatus =
  | 'DRAFT'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_PAYMENT'
  | 'PENDING_EXTERNAL_REGISTRATION'
  | 'COMPLETE'
  | (string & {});

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Explicit status variant mapping to Eucalyptus (cleared), Ochre (pending), Oxide (blocked), Deep Reef (info), or Sand (neutral).
   */
  variant?: StatusPillVariant;
  /**
   * Business domain registration status code. Automatically mapped to variant and label if omitted.
   */
  status?: RegistrationStatus;
  /**
   * Overrides auto-generated text label while preserving accessibility and dot rules.
   */
  label?: React.ReactNode;
  /**
   * Controls indicator sizing and text density.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * The dot paired with the text label — DESIGN.md Principle 1, "No state by
   * hue alone". (Not BR1, which is about a minor's guardian.)
   * @default true
   */
  showDot?: boolean;
}

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_DOCUMENTS: 'Awaiting documents',
  PENDING_PAYMENT: 'Awaiting payment',
  PENDING_EXTERNAL_REGISTRATION: 'Sent — not yet registered',
  COMPLETE: 'Registered',
};

function resolveVariant(variant?: StatusPillVariant, status?: RegistrationStatus): StatusPillVariant {
  if (variant) return variant;
  if (!status) return 'neutral';
  switch (status) {
    case 'COMPLETE':
      return 'cleared';
    case 'PENDING_DOCUMENTS':
    case 'PENDING_PAYMENT':
    case 'PENDING_EXTERNAL_REGISTRATION':
      return 'pending';
    case 'DRAFT':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function resolveLabel(variant: StatusPillVariant, status?: RegistrationStatus, customLabel?: React.ReactNode): React.ReactNode {
  if (customLabel !== undefined) return customLabel;
  if (status && REGISTRATION_STATUS_LABELS[status]) {
    return REGISTRATION_STATUS_LABELS[status];
  }
  switch (variant) {
    case 'cleared':
    case 'ok':
    case 'pass':
      return 'Cleared';
    case 'pending':
    case 'warn':
      return 'Pending';
    case 'blocked':
    case 'stop':
    case 'fail':
      return 'Blocked';
    case 'info':
      return 'Info';
    case 'neutral':
    default:
      return 'Neutral';
  }
}

const variantStyles: Record<
  'cleared' | 'pending' | 'blocked' | 'info' | 'neutral',
  { container: string; dot: string }
> = {
  cleared: {
    container: 'bg-success text-success-foreground border-transparent',
    dot: 'bg-success-indicator',
  },
  pending: {
    container: 'bg-warning text-warning-foreground border-transparent',
    dot: 'bg-warning-indicator',
  },
  blocked: {
    container: 'bg-destructive text-destructive-foreground border-transparent',
    dot: 'bg-destructive-indicator',
  },
  info: {
    container: 'bg-info text-info-foreground border-transparent',
    dot: 'bg-info-indicator',
  },
  neutral: {
    container: 'bg-secondary text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-ds-2 py-0.5 text-xs gap-ds-1.5 rounded-full font-medium',
  md: 'px-ds-3 py-ds-1 text-xs gap-ds-2 rounded-full font-semibold',
  lg: 'px-ds-4 py-ds-2 text-sm gap-ds-2 rounded-full font-semibold',
};

const dotSizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export const StatusPill = React.forwardRef<HTMLSpanElement, StatusPillProps>(
  (
    {
      variant,
      status,
      label,
      size = 'md',
      showDot = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const activeVariant = resolveVariant(variant, status);
    const normalizedKey =
      activeVariant === 'ok' || activeVariant === 'pass'
        ? 'cleared'
        : activeVariant === 'warn'
        ? 'pending'
        : activeVariant === 'stop' || activeVariant === 'fail'
        ? 'blocked'
        : activeVariant;

    const styles = variantStyles[normalizedKey] || variantStyles.neutral;
    const content = children ?? resolveLabel(activeVariant, status, label);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-sans border shrink-0 select-none whitespace-nowrap transition-colors duration-180',
          styles.container,
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn('rounded-full shrink-0', styles.dot, dotSizeStyles[size])}
            aria-hidden="true"
          />
        )}
        <span>{content}</span>
      </span>
    );
  }
);

StatusPill.displayName = 'StatusPill';