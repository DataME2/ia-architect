'use client';

import { usePathname } from 'next/navigation';

import { SITE_NAV } from '../../web/nav.ts';

/**
 * The bar's destinations, with the page you are on marked `aria-current`
 * and drawn as the chalk-yellow strip (scope 124). The layout is prerendered
 * and knows no path, so this reads it in the browser.
 */
export function TopbarLinks() {
  const path = usePathname();
  return SITE_NAV.map((l) => (
    <a
      key={l.href}
      href={l.href}
      aria-current={path === l.href || path.startsWith(`${l.href}/`) ? 'page' : undefined}
    >
      {l.label}
    </a>
  ));
}
