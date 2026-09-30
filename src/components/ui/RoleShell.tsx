import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RoleShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Persistent IdentityRail or primary navigation component placed on the left side of the workspace.
   */
  rail?: React.ReactNode;
  /**
   * Main workspace content or active operational screen rendered on the right.
   */
  children?: React.ReactNode;
  /**
   * Optional top banner or alert notice rendered above the split grid.
   */
  topBar?: React.ReactNode;
  /**
   * Maximum layout container width styling.
   * @default 'max-w-[78rem]'
   */
  maxWidth?: string;
}

export const RoleShell = React.forwardRef<HTMLDivElement, RoleShellProps>(
  (
    {
      rail,
      children,
      topBar,
      maxWidth = 'max-w-[78rem]',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('w-full mx-auto px-ds-4 py-ds-4 sm:py-ds-6 font-sans', maxWidth, className)}
        {...props}
      >
        {topBar && <div className="mb-ds-5">{topBar}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-ds-5 items-start">
          {rail && (
            <div className="w-full lg:sticky lg:top-ds-4 shrink-0">
              {rail}
            </div>
          )}

          <main className="min-w-0 w-full flex-1 flex flex-col gap-ds-5">
            {children}
          </main>
        </div>
      </div>
    );
  }
);

RoleShell.displayName = 'RoleShell';