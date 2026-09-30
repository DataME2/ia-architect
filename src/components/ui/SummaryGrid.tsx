import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SummaryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of column grid tracks, or 'auto' for responsive auto-fit flow.
   * @default 'auto'
   */
  columns?: 1 | 2 | 3 | 4 | 5 | 'auto';
  /**
   * Spacing gap between grid stat items.
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Minimum width column threshold when columns is 'auto'.
   * @default '11rem'
   */
  minColumnWidth?: string;
  /** Grid items, typically StatCards */
  children: React.ReactNode;
}

const gapStyles: Record<NonNullable<SummaryGridProps['gap']>, string> = {
  sm: 'gap-ds-2',
  md: 'gap-ds-3',
  lg: 'gap-ds-4',
};

const columnStyles: Record<Exclude<NonNullable<SummaryGridProps['columns']>, 'auto'>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-3 lg:grid-cols-5',
};

export const SummaryGrid = React.forwardRef<HTMLDivElement, SummaryGridProps>(
  (
    {
      columns = 'auto',
      gap = 'md',
      minColumnWidth = '11rem',
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isAuto = columns === 'auto';

    return (
      <div
        ref={ref}
        className={cn(
          'grid w-full mb-ds-5',
          gapStyles[gap],
          !isAuto && columnStyles[columns],
          className
        )}
        style={{
          ...(isAuto
            ? {
                gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumnWidth}), 1fr))`,
              }
            : {}),
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SummaryGrid.displayName = 'SummaryGrid';