import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of column tracks or 'auto' for responsive CSS auto-fill flow.
   * @default 'auto'
   */
  columns?: 1 | 2 | 3 | 4 | 5 | 'auto';
  /**
   * Spacing gap between cards in the grid.
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Minimum width column threshold when `columns` is 'auto'.
   * @default '16rem'
   */
  minColumnWidth?: string;
  /**
   * Ensures all cards in the grid stretch to equal height per row.
   * @default true
   */
  equalHeight?: boolean;
  /** Grid items, typically Cards, PlayerCards, or FixtureCards */
  children: React.ReactNode;
}

const gapStyles: Record<NonNullable<CardGridProps['gap']>, string> = {
  sm: 'gap-ds-3',
  md: 'gap-ds-4',
  lg: 'gap-ds-5',
  xl: 'gap-ds-6',
};

const columnStyles: Record<Exclude<NonNullable<CardGridProps['columns']>, 'auto'>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
};

export const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  (
    {
      columns = 'auto',
      gap = 'md',
      minColumnWidth = '16rem',
      equalHeight = true,
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
          equalHeight ? 'items-stretch' : 'items-start',
          !isAuto && columnStyles[columns],
          className
        )}
        style={{
          ...(isAuto
            ? {
                gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}), 1fr))`,
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

CardGrid.displayName = 'CardGrid';