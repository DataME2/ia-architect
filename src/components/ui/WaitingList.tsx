'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill } from './StatusPill.tsx';

/**
 * "What is waiting for you" (scope 89): the person's own open items across
 * every role they hold, most urgent first.
 *
 * Presentational only. The items, their order and their tone are decided in
 * `src/web/home-view.ts` and arrive as props; this renders them and lets the
 * person narrow the list to one role. The filter is local state on purpose:
 * it hides rows, it never switches role (BR61 — that is a link, below).
 */
export interface WaitingListItem {
  readonly id: string;
  readonly headline: string;
  readonly detail: string | null;
  /** Where it is answered: a role context (`/me?role=…`) or a club screen. */
  readonly href: string;
  readonly roleLabel: string;
  readonly clubName: string | null;
  /** A short name for the kind of item: "Appointment offered". */
  readonly tag: string;
  /** Gold is waiting on you; red is blocked or overdue. */
  readonly tone: 'pending' | 'blocked';
}

export interface WaitingListProps extends React.HTMLAttributes<HTMLElement> {
  readonly items: readonly WaitingListItem[];
  /** The heading's id, so the section is named by it. */
  readonly headingId?: string;
}

const ALL = 'All';

export function WaitingList({ items, headingId = 'waiting-heading', className, ...props }: WaitingListProps) {
  const [filter, setFilter] = React.useState<string>(ALL);
  const roles = React.useMemo(() => [...new Set(items.map((i) => i.roleLabel))], [items]);
  const shown = filter === ALL ? items : items.filter((i) => i.roleLabel === filter);

  return (
    <section aria-labelledby={headingId} className={cn('font-sans', className)} {...props}>
      <div className="flex flex-wrap items-baseline justify-between gap-ds-2 mb-ds-3">
        <h2 id={headingId} className="m-0 text-lg font-semibold text-foreground">
          What is waiting for you
        </h2>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          {items.length === 0 ? 'Nothing' : `${items.length} item${items.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {roles.length > 1 && (
        <div role="group" aria-label="Show items for" className="flex flex-wrap gap-ds-2 mb-ds-3">
          {[ALL, ...roles].map((r) => {
            const on = filter === r;
            const count = r === ALL ? items.length : items.filter((i) => i.roleLabel === r).length;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(r)}
                className={cn(
                  // globals.css paints every <button> in the accent and lifts it on
                  // hover; these chips are toggles, so both are overridden.
                  'min-h-[44px] px-ds-3 rounded-full border text-sm font-medium shadow-none transition-colors duration-180',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                  on
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary-hover! hover:text-primary-foreground!'
                    : 'bg-surface text-foreground border-border-strong hover:bg-surfaceSubtle! hover:text-foreground!',
                )}
              >
                {r} <span className="font-mono text-xs opacity-80">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="m-0 p-ds-4 rounded-md border border-border bg-surface text-sm text-muted">
          Nothing is waiting for you{filter === ALL ? '' : ` as ${filter.toLowerCase()}`}. When something needs your
          answer, it appears here first.
        </p>
      ) : (
        <ol className="m-0 p-0 list-none flex flex-col gap-ds-2">
          {shown.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center gap-ds-3 p-ds-4 rounded-md border border-border bg-surface shadow-xs border-l-4',
                item.tone === 'blocked' ? 'border-l-destructive-indicator' : 'border-l-warning-indicator',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-ds-2 mb-ds-1">
                  <StatusPill variant={item.tone} size="sm" label={item.tag} />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted truncate">
                    {item.roleLabel}
                    {item.clubName !== null && ` · ${item.clubName}`}
                  </span>
                </div>
                <p className="m-0 text-base font-semibold text-foreground leading-snug">{item.headline}</p>
                {item.detail !== null && <p className="m-0 mt-ds-1 text-sm text-muted-foreground">{item.detail}</p>}
              </div>
              <a
                href={item.href}
                className={cn(
                  // globals.css underlines every <a> and recolours it on hover.
                  'inline-flex items-center justify-center shrink-0 min-h-[44px] px-ds-4 rounded-sm border no-underline',
                  'text-sm font-semibold bg-primary text-primary-foreground border-transparent',
                  'hover:bg-primary-hover hover:text-primary-foreground transition-colors duration-180',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                )}
              >
                Open<span className="sr-only">: {item.headline}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
