'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface RegistrarNavItem {
  /** Target link path (e.g. '/registrar/people') */
  href: string;
  /** Label text for navigation link */
  label: string;
  /** Whether navigation link appends active season query param */
  seasonScoped?: boolean;
  /** Heading this link sits under; a heading is drawn where the group changes */
  group?: string;
}

export const DEFAULT_REGISTRAR_NAV: RegistrarNavItem[] = [
  { href: '/registrar', label: 'Queue', seasonScoped: true },
  { href: '/registrar/season', label: 'Season requirements', seasonScoped: true },
  { href: '/registrar/invitations', label: 'Registration links', seasonScoped: true },
  { href: '/registrar/people', label: 'People', seasonScoped: true },
  { href: '/registrar/teams', label: 'Teams', seasonScoped: true },
  { href: '/registrar/fixtures', label: 'Fixtures', seasonScoped: true },
  { href: '/registrar/referees', label: 'Match officials', seasonScoped: true },
  { href: '/registrar/designations', label: 'Designations', seasonScoped: true },
  { href: '/registrar/verification', label: 'Verify a match', seasonScoped: true },
  { href: '/registrar/referee-payments', label: 'Match official payments', seasonScoped: true },
  { href: '/registrar/fees', label: 'Match official fees', seasonScoped: false },
  { href: '/registrar/governance', label: 'Governance', seasonScoped: false },
  { href: '/registrar/committee-hub', label: 'Committee hub', seasonScoped: false },
  { href: '/registrar/sponsors', label: 'Sponsors', seasonScoped: false },
  { href: '/registrar/duplicates', label: 'Duplicates', seasonScoped: false },
  { href: '/registrar/pack', label: 'Submission pack', seasonScoped: true },
  { href: '/registrar/reports', label: 'Reports', seasonScoped: true },
  { href: '/registrar/arrears', label: 'Arrears', seasonScoped: false },
  { href: '/registrar/carnivals', label: 'Carnivals', seasonScoped: false },
  { href: '/registrar/privacy', label: 'Privacy', seasonScoped: false },
  { href: '/registrar/access', label: 'Access', seasonScoped: false },
];

export interface RegistrarNavProps extends React.HTMLAttributes<HTMLElement> {
  /** Navigation destinations list. Defaults to standard 19 registrar menu destinations */
  items?: RegistrarNavItem[];
  /** Current active path for lighting up active link */
  activePathname?: string;
  /** Current season ID to carry in seasonScoped links */
  seasonId?: string | null;
  /** Navigation link click callback */
  onNavigate?: (item: RegistrarNavItem, href: string) => void;
  /** Rail title section heading text */
  title?: string;
}

export function isNavActive(currentPath: string, itemHref: string, allItems: RegistrarNavItem[]): boolean {
  if (itemHref === '/registrar') {
    return (
      currentPath === '/registrar' ||
      !allItems.some(
        (other) =>
          other.href !== '/registrar' &&
          (currentPath === other.href || currentPath.startsWith(`${other.href}/`))
      )
    );
  }
  return currentPath === itemHref || currentPath.startsWith(`${itemHref}/`);
}

export function buildNavHref(item: RegistrarNavItem, seasonId?: string | null): string {
  if (!item.seasonScoped || !seasonId) return item.href;
  return `${item.href}?season=${encodeURIComponent(seasonId)}`;
}

export const RegistrarNav = React.forwardRef<HTMLElement, RegistrarNavProps>(
  (
    {
      items = DEFAULT_REGISTRAR_NAV,
      activePathname = '/registrar',
      seasonId,
      onNavigate,
      title = 'Club administration',
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const navId = React.useId();

    return (
      <nav
        ref={ref}
        aria-label={title}
        // The dashboard draft's dark sidebar (scope 106): the rail's colours in
        // both schemes, as the identity rail on /me already is.
        className={cn(
          'print:hidden w-full md:max-w-[260px] flex flex-col font-sans text-rail-foreground bg-rail border border-rail-line rounded-lg shadow-md p-3',
          className
        )}
        {...props}
      >
        {/* Mobile Toggle Panel Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={navId}
          className="md:hidden flex items-center justify-between w-full min-h-[44px] px-3 py-2 rounded-md shadow-none bg-rail-foreground/5 border-2 border-rail-line text-sm font-semibold text-rail-foreground hover:bg-rail-foreground/10! hover:text-rail-foreground! transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg
              viewBox="0 0 20 20"
              className="w-4 h-4 shrink-0 stroke-current"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {isOpen ? (
                <path d="M5 5l10 10M15 5L5 15" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" />
              )}
            </svg>
            <span>{title}</span>
          </span>
          <span className="font-mono text-xs text-rail-muted uppercase">
            {isOpen ? 'Close' : 'Menu'}
          </span>
        </button>

        {/* Section Heading for Desktop */}
        {title && (
          <p className="hidden md:block text-sm font-semibold text-rail-foreground px-3 py-1 mb-ds-2">
            {title}
          </p>
        )}

        {/* Nav Links Container */}
        <div
          id={navId}
          className={cn(
            'flex-col gap-1 transition-all duration-180',
            isOpen ? 'flex mt-2' : 'hidden md:flex'
          )}
        >
          {items.map((item, i) => {
            const startsGroup = item.group !== undefined && item.group !== items[i - 1]?.group;
            const isCurrent = isNavActive(activePathname, item.href, items);
            const targetHref = buildNavHref(item, seasonId);

            const handleClick = (e: React.MouseEvent) => {
              setIsOpen(false);
              if (onNavigate) {
                e.preventDefault();
                onNavigate(item, targetHref);
              }
            };

            return (
              <React.Fragment key={item.href}>
                {/* Each section in its own hue (globals.css, [data-section]):
                    the heading, a rule fading out after it, the current link. */}
                {startsGroup && (
                  <p
                    data-section={item.group}
                    className={cn(
                      'flex items-center gap-2 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-(--section) px-3 mb-1',
                      i > 0 ? 'mt-ds-4' : 'mt-0'
                    )}
                  >
                    {item.group}
                    <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-linear-to-r from-(--section) to-transparent" />
                  </p>
                )}
                <a
                  href={targetHref}
                  onClick={handleClick}
                  aria-current={isCurrent ? 'page' : undefined}
                  data-section={item.group}
                  className={cn(
                    'flex items-center min-h-[44px] px-3 py-1.5 rounded-md text-sm no-underline transition-colors select-none',
                    isCurrent
                      ? 'bg-(--section)/15 shadow-[inset_3px_0_0_var(--section)] text-rail-foreground hover:text-rail-foreground font-semibold'
                      : 'text-rail-muted font-medium hover:bg-(--section)/10 hover:text-rail-foreground'
                  )}
                >
                  {item.label}
                </a>
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    );
  }
);

RegistrarNav.displayName = 'RegistrarNav';