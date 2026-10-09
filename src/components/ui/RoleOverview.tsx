import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The roles a person holds, side by side (scope 89). Each card is a link
 * into that role's workspace: switching stays explicit and a URL (BR61), and
 * a card shows only a count of the person's own waiting items in that role,
 * never the role's content.
 *
 * Presentational only: the cards arrive as props from `src/web/home-view.ts`.
 */
export interface RoleOverviewCard {
  readonly key: string;
  readonly label: string;
  readonly clubName: string;
  readonly scope: string | null;
  readonly href: string;
  readonly waiting: number;
  /** The role's colour on the rail and the acting-as banner. Decoration only. */
  readonly hue?: string;
}

export interface RoleOverviewProps extends React.HTMLAttributes<HTMLElement> {
  readonly roles: readonly RoleOverviewCard[];
  readonly headingId?: string;
}

export function RoleOverview({ roles, headingId = 'roles-heading', className, ...props }: RoleOverviewProps) {
  return (
    <section aria-labelledby={headingId} className={cn('font-sans', className)} {...props}>
      <h2 id={headingId} className="m-0 mb-ds-1 text-lg font-semibold text-foreground">
        Your roles
      </h2>
      <p className="m-0 mb-ds-3 text-sm text-muted">
        One person, {roles.length} role{roles.length === 1 ? '' : 's'}. Open one to work in it; nothing from one role
        appears in another.
      </p>
      <ul className="m-0 p-0 list-none grid gap-ds-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <li key={`${r.key}:${r.href}`}>
            <a
              href={r.href}
              style={r.hue === undefined ? undefined : ({ ['--role-hue' as string]: r.hue } as React.CSSProperties)}
              className={cn(
                'group flex h-full min-h-[44px] flex-col gap-ds-2 p-ds-4 rounded-md border border-border bg-surface shadow-xs no-underline',
                'border-l-[6px] [border-left-color:var(--role-hue,var(--border-strong))]',
                'text-foreground hover:text-foreground hover:shadow-md hover:border-border-strong transition-shadow duration-180',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
              )}
            >
              <span className="flex items-start justify-between gap-ds-2">
                <span className="min-w-0">
                  <span className="block text-base font-semibold leading-tight">{r.label}</span>
                  <span className="block mt-ds-1 font-mono text-[11px] uppercase tracking-wider text-muted truncate">
                    {r.clubName}
                    {r.scope !== null && ` · ${r.scope}`}
                  </span>
                </span>
                {r.waiting > 0 ? (
                  <span className="shrink-0 inline-flex items-center gap-ds-1.5 px-ds-2 py-0.5 rounded-full bg-warning text-warning-foreground text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-warning-indicator" aria-hidden="true" />
                    {r.waiting} waiting
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-ds-1.5 px-ds-2 py-0.5 rounded-full bg-success text-success-foreground text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-success-indicator" aria-hidden="true" />
                    Up to date
                  </span>
                )}
              </span>
              <span className="mt-auto text-sm font-semibold text-primary group-hover:underline">
                Open {r.label.toLowerCase()} workspace →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
