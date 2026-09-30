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
   * Maximum layout container width styling.
   * @default 'max-w-[78rem]'
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
      maxWidth = 'max-w-[78rem]',
      className,
      ...props
    },
    ref
  ) => {
    const isNavRight = railPosition === 'right';

    return (
      <div
        ref={ref}
        className={cn('w-full mx-auto px-ds-4 py-ds-4 sm:py-ds-6 font-sans', maxWidth, className)}
        {...props}
      >
        {topBar && <div className="mb-ds-5">{topBar}</div>}

        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px] gap-ds-5 items-start',
            !isNavRight && 'md:grid-cols-[260px_minmax(0,1fr)]'
          )}
        >
          {/* Left Column in 'right' mode = Main content */}
          {isNavRight && (
            <main className="min-w-0 w-full flex-1 flex flex-col gap-ds-5 order-2 md:order-1">
              {children}
            </main>
          )}

          {/* Nav Rail Column */}
          {nav && (
            <aside
              aria-label="Registrar Administration Menu"
              className={cn(
                'w-full md:sticky md:top-ds-4 shrink-0',
                isNavRight ? 'order-1 md:order-2' : 'order-1'
              )}
            >
              {nav}
            </aside>
          )}

          {/* Right Column in 'left' mode = Main content */}
          {!isNavRight && (
            <main className="min-w-0 w-full flex-1 flex flex-col gap-ds-5 order-2">
              {children}
            </main>
          )}
        </div>
      </div>
    );
  }
);

RegistrarShell.displayName = 'RegistrarShell';