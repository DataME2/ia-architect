'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { REGISTRAR_NAV, isActive, navHref } from '../../../web/nav.ts';

/**
 * The club-facing menu, on every club-facing screen.
 *
 * A client component only because knowing which link is current needs the
 * path and the season, and a layout is given neither. The decision itself is
 * in `src/web/nav.ts` and unit-tested; this renders it.
 */
export function RegistrarNav() {
  const pathname = usePathname();
  const seasonId = useSearchParams().get('season');

  return (
    <nav className="app-nav" aria-label="Club administration">
      {REGISTRAR_NAV.map((item) => {
        const current = isActive(pathname, item);
        return (
          <a
            key={item.href}
            href={navHref(item, seasonId)}
            className={current ? 'app-nav-link is-current' : 'app-nav-link'}
            aria-current={current ? 'page' : undefined}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
