import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RegistrarShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Registrar navigation rail component (`RegistrarNav`). Positioned on the right by default.
   */
  nav?: React.ReactNode;
  /**
   * Main administrative content area.
   */
  children?: React.ReactNode;
  /**
   * Placement of the administration navigation rail relative to the content area.
   * @default 'right'
   */
  railPosition?: 'right' | 'left';
  /**
   * Optional top banner, context summary bar, or tenant indicator rendered above the shell grid.
   */
  topBar?: React.ReactNode;
  /**
   * Maximum layout container width styling. None by default: in this app the
   * root layout's `.shell` already sets the page width and gutters, and a
   * second set would double them.
   * @default ''
   */
  maxWidth?: string;
}

export const RegistrarShell = React.forwardRef<HTMLDivElement, RegistrarShellProps>(
  (
    {
      nav,
      children,
      railPosition = 'right',
      topBar,
      maxWidth = '',
      className,
      ...props
    },
    ref
  ) => {
    const isNavRight = railPosition === 'right';

    return (
      <div
        ref={ref}
        className={cn('w-full mx-auto font-sans', maxWidth, className)}
        {...props}
      >
        {topBar && <div className="mb-ds-5">{topBar}</div>}

        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-ds-5 items-start',
            !isNavRight && 'md:grid-cols-[260px_minmax(0,1fr)]'
          )}
        >
          {/* Content. A <div>, not <main>: the page's single <main> landmark is
              the root layout's, and a second one is invalid. Normal flow, not a
              flex column, so every screen keeps its own vertical rhythm. */}
          {isNavRight && (
            <div className="min-w-0 w-full order-2 md:order-1">
              {children}
            </div>
          )}

          {/* Nav column. A plain wrapper: the <nav> inside is already the
              labelled landmark, and a labelled aside around it would announce
              a landmark within a landmark. */}
          {nav && (
            <div
              className={cn(
                'w-full md:sticky md:top-ds-4 shrink-0',
                isNavRight ? 'order-1 md:order-2' : 'order-1'
              )}
            >
              {nav}
            </div>
          )}

          {!isNavRight && (
            <div className="min-w-0 w-full order-2">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }
);

RegistrarShell.displayName = 'RegistrarShell';