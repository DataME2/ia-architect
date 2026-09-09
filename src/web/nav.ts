/**
 * Where the club-facing screens are, and which one you are on.
 *
 * Every destination used to live in a row of buttons on the queue page, and
 * every other screen offered one link: back to the queue. So moving between
 * two screens meant passing through a third, and no screen ever said where
 * it sat. This is that decision, made once and rendered by the layout.
 */

/** A registrar destination. `seasonScoped` links carry the chosen season. */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly seasonScoped: boolean;
}

export const REGISTRAR_NAV: readonly NavItem[] = [
  { href: '/registrar', label: 'Queue', seasonScoped: true },
  { href: '/registrar/season', label: 'Season requirements', seasonScoped: true },
  { href: '/registrar/invitations', label: 'Registration links', seasonScoped: true },
  { href: '/registrar/people', label: 'People', seasonScoped: true },
  { href: '/registrar/teams', label: 'Teams', seasonScoped: true },
  { href: '/registrar/fixtures', label: 'Fixtures', seasonScoped: true },
  { href: '/registrar/referees', label: 'Match officials', seasonScoped: true },
  { href: '/registrar/designations', label: 'Designations', seasonScoped: true },
  { href: '/registrar/governance', label: 'Governance', seasonScoped: false },
  { href: '/registrar/duplicates', label: 'Duplicates', seasonScoped: false },
  { href: '/registrar/pack', label: 'Submission pack', seasonScoped: true },
  { href: '/registrar/access', label: 'Access', seasonScoped: false },
];

/**
 * The season travels with the link, so navigating never silently changes
 * which season you are looking at — a queue for 2027 and a pack for 2026 is
 * the kind of mismatch nobody notices until the pack goes out.
 */
export function navHref(item: NavItem, seasonId: string | null): string {
  if (!item.seasonScoped || seasonId === null || seasonId === '') return item.href;
  return `${item.href}?season=${encodeURIComponent(seasonId)}`;
}

/**
 * `/registrar` is a prefix of every other destination, so a naive
 * `startsWith` marks the queue active on all of them. Exact match for the
 * queue, prefix for the rest — `/registrar/pack/3` should still light up
 * *Submission pack*, and `/registrar/<uuid>` (one registration) belongs to
 * the queue it was opened from.
 */
export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/registrar') {
    return pathname === '/registrar' || !REGISTRAR_NAV.some(
      (other) => other.href !== '/registrar' && isPrefix(pathname, other.href),
    );
  }
  return isPrefix(pathname, item.href);
}

function isPrefix(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Whether this club is the demonstration tenant.
 *
 * Decided by the name, which is the same marker `supabase/demo/teardown.sql`
 * refuses to delete without — one convention, checked in both places, rather
 * than a column on `club` that a real club could be given by accident. The
 * demo is a real tenant with real policies, and the only thing that should
 * differ is that everyone can see it is the demo.
 */
export function isDemoClub(clubName: string): boolean {
  return clubName.toUpperCase().includes('(DEMO)');
}

/**
 * What the current session is looking at, for the one screen whose whole job
 * is answering that.
 *
 * Three outcomes rather than a boolean, because "not the demo" and "not
 * signed in" must not look alike. Reading real children's records while
 * believing they are fictional is the mistake this exists to prevent, and it
 * is the one that costs something.
 */
export type WhereAmI =
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'no-membership' }
  | { readonly kind: 'demo'; readonly clubName: string }
  | { readonly kind: 'real'; readonly clubName: string };

export function whereAmI(signedIn: boolean, clubName: string | null): WhereAmI {
  if (!signedIn) return { kind: 'signed-out' };
  if (clubName === null) return { kind: 'no-membership' };
  return isDemoClub(clubName) ? { kind: 'demo', clubName } : { kind: 'real', clubName };
}
