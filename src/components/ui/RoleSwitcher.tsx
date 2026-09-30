'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RoleHolding {
  /** Role identifier key (e.g. 'player', 'coach', 'registrar', 'guardian', 'referee') */
  key: string;
  /** Human-readable title or override label for this role */
  label?: string;
  /** Unique identifier for the associated club */
  clubId: string;
  /** Name of the club or organization */
  clubName: string;
  /** Scope or subdivision indicator (e.g. 'Senior Men', 'U12 Girls') */
  scope?: string | null;
  /** Number of pending tasks or items awaiting action in this role context */
  count?: number | null;
  /** Optional custom link URL when clicked */
  href?: string;
}

export interface RoleSwitcherProps extends React.HTMLAttributes<HTMLElement> {
  /** List of role holdings held by the person */
  roles: RoleHolding[];
  /** Identifier of the currently active role key */
  activeRoleKey?: string | undefined;
  /** Identifier of the currently active club ID */
  activeClubId?: string | undefined;
  /** Callback triggered when a role selection is clicked */
  onRoleSelect?: ((role: RoleHolding) => void) | undefined;
  /** Header label above the role list. Defaults to "Acting as" */
  title?: string;
}

const DEFAULT_ROLE_LABELS: Record<string, string> = {
  player: 'Player',
  guardian: 'Guardian / Parent',
  referee: 'Match Official',
  coach: 'Team Coach',
  registrar: 'Club Registrar',
  admin: 'Administrator',
  committee: 'Committee Member',
  coordinator: 'Age Coordinator',
  treasurer: 'Club Treasurer',
};

export const RoleSwitcher = React.forwardRef<HTMLElement, RoleSwitcherProps>(
  (
    {
      roles,
      activeRoleKey,
      activeClubId,
      onRoleSelect,
      title = 'Acting as',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <nav
        ref={ref}
        aria-label="Choose operational role context"
        className={cn('w-full font-sans text-rail-foreground', className)}
        {...props}
      >
        {title && (
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-rail-muted mb-2 px-1">
            {title}
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          {roles.map((holding) => {
            const isCurrent =
              activeRoleKey === holding.key &&
              (activeClubId === undefined || activeClubId === holding.clubId);

            const displayLabel =
              holding.label || DEFAULT_ROLE_LABELS[holding.key] || holding.key;
            const targetHref =
              holding.href ||
              `?role=${encodeURIComponent(holding.key)}&club=${encodeURIComponent(holding.clubId)}`;

            const handleClick = (e: React.MouseEvent) => {
              if (onRoleSelect) {
                e.preventDefault();
                onRoleSelect(holding);
              }
            };

            return (
              <a
                key={`${holding.key}:${holding.clubId}`}
                href={targetHref}
                onClick={handleClick}
                aria-current={isCurrent ? 'true' : undefined}
                className={cn(
                  'group flex items-center justify-between min-h-[44px] px-3 py-2 rounded-sm text-xs transition-colors duration-180 cursor-pointer border-l-4 select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  isCurrent
                    ? 'bg-rail-line text-rail-foreground font-semibold border-primary shadow-xs'
                    : 'bg-transparent text-rail-foreground/80 hover:bg-rail-line/60 hover:text-rail-foreground border-transparent'
                )}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-sans text-xs font-medium leading-tight truncate">
                    {displayLabel}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-rail-muted tracking-tight truncate mt-0.5">
                    {holding.clubName.toUpperCase()}
                    {holding.scope ? ` · ${holding.scope.toUpperCase()}` : ''}
                  </span>
                </div>

                {/* Ochre: pending work (DESIGN.md). Desert orange is the Assistant's alone. */}
                {typeof holding.count === 'number' && holding.count > 0 && (
                  <span className="shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-mono font-bold bg-warning text-warning-foreground shadow-xs">
                    {holding.count}
                    <span className="sr-only"> waiting tasks</span>
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </nav>
    );
  }
);

RoleSwitcher.displayName = 'RoleSwitcher';