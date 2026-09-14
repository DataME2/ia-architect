'use client';

import { useId, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { REGISTRAR_NAV, isActive, navHref } from '../../../web/nav.ts';

/**
 * The club-facing menu, on every club-facing screen.
 *
 * Two shapes, one component. **Laptop and up:** a vertical rail on the
 * right of the content — twelve destinations in a bar above the content
 * used to wrap onto two crowded lines and push the thing a screen actually
 * opens for below the fold; stacked, they read as a list regardless of how
 * many there are. **Phone:** there is no room for a rail beside the
 * content *or* above it without one of them losing, so it collapses to a
 * button that opens the list as a panel, and closes again once a
 * destination is chosen — the pattern this size of screen actually expects.
 *
 * The open/closed state is local and starts closed on every navigation: the
 * links are plain `<a>` tags (this screen has never used `next/link`), so
 * choosing one is a full page load and the component remounts closed on
 * arrival. Nothing has to close it by hand.
 *
 * A client component only because knowing which link is current needs the
 * path and the season, and a layout is given neither. The decision itself is
 * in `src/web/nav.ts` and unit-tested; this renders it.
 */
export function RegistrarNav() {
  const pathname = usePathname();
  const seasonId = useSearchParams().get('season');
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <nav className={open ? 'registrar-nav-rail is-open' : 'registrar-nav-rail'} aria-label="Club administration">
      <button
        type="button"
        className="registrar-nav-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="registrar-nav-toggle-icon" aria-hidden="true">
          {open ? (
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </span>
        Menu
      </button>

      <p className="rail-label">Club administration</p>

      <div className="registrar-nav-list" id={listId}>
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
