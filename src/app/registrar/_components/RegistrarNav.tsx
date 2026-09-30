'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { RegistrarNav as DesignRegistrarNav } from '../../../components/ui/RegistrarNav.tsx';
import { REGISTRAR_NAV } from '../../../web/nav.ts';

/**
 * The club-facing menu, on every club-facing screen — rendered by the design
 * system's RegistrarNav (scope 69): a rail beside the content on a laptop, a
 * Menu button that opens the list on a phone.
 *
 * The destinations are `src/web/nav.ts`'s, passed in, never the design
 * component's own default list — one list, unit-tested, so a screen added
 * there appears here. A client component only because knowing which link is
 * current needs the path and the season, and a layout is given neither.
 */
export function RegistrarNav() {
  const pathname = usePathname();
  const seasonId = useSearchParams().get('season');

  return (
    <DesignRegistrarNav
      items={REGISTRAR_NAV.map((item) => ({ ...item }))}
      activePathname={pathname}
      seasonId={seasonId}
    />
  );
}
