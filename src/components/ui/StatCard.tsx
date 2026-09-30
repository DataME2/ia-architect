import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardTrend {
  /** Numerical value or percentage string, e.g. "+12%" or "-3" */
  value: string | number;
  /** Context description, e.g. "vs last month" */
  label?: string;
  /** Visual direction tone */
  direction?: 'up' | 'down' | 'neutral';
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Primary label or title for the stat metric */
  label: React.ReactNode;
  /** Primary numerical value or stat string, displayed with tabular figures */
  value: React.ReactNode;
  /** Optional secondary description or hint text below the value */
  description?: React.ReactNode;
  /** Optional top-right icon or badge element */
  icon?: React.ReactNode;
  /** Optional trend indicator chip */
  trend?: StatCardTrend;
  /**
   * Whether to display the signature gold/reef top border rail.
   * @default true
   */
  showRail?: boolean;
  /**
   * Color theme for the top accent rail.
   * @default 'gold-reef'
   */
  railVariant?: 'gold-reef' | 'primary' | 'accent' | 'success' | 'destructive';
  /**
   * Card visual density size.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

const railVariantStyles: Record<NonNullable<StatCardProps['railVariant']>, string> = {
  'gold-reef': 'bg-gradient-to-r from-accent via-warning-indicator to-primary',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success-indicator',
  destructive: 'bg-destructive-indicator',
};

const sizePaddingStyles: Record<NonNullable<StatCardProps['size']>, string> = {
  sm: 'p-ds-3',
  md: 'p-ds-4',
  lg: 'p-ds-5',
};

const sizeValueStyles: Record<NonNullable<StatCardProps['size']>, string> = {
  sm: 'text-xl font-bold tracking-tight',
  md: 'text-2xl sm:text-[1.85rem] font-bold tracking-tight',
  lg: 'text-3xl sm:text-4xl font-bold tracking-tight',
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      label,
      value,
      description,
      icon,
      trend,
      showRail = true,
      railVariant = 'gold-reef',
      size = 'md',
      className,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const isClickable = Boolean(onClick);

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        className={cn(
          'relative overflow-hidden rounded bg-surface border border-border shadow-xs transition-all duration-180',
          sizePaddingStyles[size],
          isClickable && 'cursor-pointer hover:border-border-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          className
        )}
        {...props}
      >
        {showRail && (
          <div
            className={cn('absolute inset-x-0 top-0 h-[3px]', railVariantStyles[railVariant])}
            aria-hidden="true"
          />
        )}

        <div className="flex items-start justify-between gap-ds-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted m-0">
            {label}
          </p>
          {icon && <div className="text-muted shrink-0 flex items-center">{icon}</div>}
        </div>

        <div className="mt-ds-2 flex items-baseline flex-wrap gap-x-ds-3 gap-y-ds-1">
          <span
            className={cn(
              'font-mono tabular-nums leading-none text-foreground block',
              sizeValueStyles[size]
            )}
          >
            {value}
          </span>

          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-ds-1 text-xs font-semibold px-ds-1.5 py-0.5 rounded-sm font-mono tabular-nums',
                trend.direction === 'up' && 'bg-success text-success-foreground',
                trend.direction === 'down' && 'bg-destructive text-destructive-foreground',
                (!trend.direction || trend.direction === 'neutral') && 'bg-secondary text-muted-foreground'
              )}
            >
              <span>{trend.value}</span>
              {trend.label && <span className="font-normal opacity-80">{trend.label}</span>}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-ds-2 text-xs text-muted-foreground leading-normal m-0">
            {description}
          </p>
        )}

        {children}
      </div>
    );
  }
);

StatCard.displayName = 'StatCard';