'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { REGISTRAR_NAV, isActive, navHref } from '../../../web/nav.ts';

/**
 * The club-facing menu, on every club-facing screen.
 *
 * A vertical rail on the right of the page rather than a bar above it —
 * twelve destinations wrapped onto two crowded lines above the content,
 * which pushed the thing every screen actually opens for below the fold.
 * Stacked, they read as a list instead of a puzzle, and there is room to
 * add an eleventh without a reflow.
 *
 * A client component only because knowing which link is current needs the
 * path and the season, and a layout is given neither. The decision itself is
 * in `src/web/nav.ts` and unit-tested; this renders it.
 */
export function RegistrarNav() {
  const pathname = usePathname();
  const seasonId = useSearchParams().get('season');

  return (
    <nav className="registrar-nav-rail" aria-label="Club administration">
      <p className="rail-label">Club administration</p>
      <div className="registrar-nav-list">
        {REGISTRAR_NAV.map((item) => {
          const current = isActive(pathname, item);
          return (
            <a
              key={item.href}
              href={navHref(item, seasonId)}
              className={current ? 'registrar-nav-link is-current' : 'registrar-nav-link'}
              aria-current={current ? 'page' : undefined}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
