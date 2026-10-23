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
  /** The heading it sits under in the menu; items of a group are adjacent. */
  readonly group: NavGroup;
}

/** The menu headings, in order: the season, the match, the money, the club. */
export const NAV_GROUPS = ['Season', 'Match day', 'Money', 'Club'] as const;
export type NavGroup = (typeof NAV_GROUPS)[number];

export const REGISTRAR_NAV: readonly NavItem[] = [
  { href: '/registrar', label: 'Queue', seasonScoped: true, group: 'Season' },
  { href: '/registrar/season', label: 'Season requirements', seasonScoped: true, group: 'Season' },
  { href: '/registrar/invitations', label: 'Registration links', seasonScoped: true, group: 'Season' },
  { href: '/registrar/people', label: 'People', seasonScoped: true, group: 'Season' },
  { href: '/registrar/teams', label: 'Teams', seasonScoped: true, group: 'Season' },
  { href: '/registrar/duplicates', label: 'Duplicates', seasonScoped: false, group: 'Season' },
  { href: '/registrar/pack', label: 'Submission pack', seasonScoped: true, group: 'Season' },
  { href: '/registrar/reports', label: 'Reports', seasonScoped: true, group: 'Season' },
  { href: '/registrar/fixtures', label: 'Fixtures', seasonScoped: true, group: 'Match day' },
  { href: '/registrar/referees', label: 'Match officials', seasonScoped: true, group: 'Match day' },
  { href: '/registrar/designations', label: 'Designations', seasonScoped: true, group: 'Match day' },
  { href: '/registrar/verification', label: 'Verify a match', seasonScoped: true, group: 'Match day' },
  { href: '/registrar/carnivals', label: 'Carnivals', seasonScoped: false, group: 'Match day' },
  { href: '/registrar/referee-payments', label: 'Match official payments', seasonScoped: true, group: 'Money' },
  // Not season-scoped: a fee schedule is dated from a day and runs until
  // the next one supersedes it (BR115), which is not the same shape as a
  // season and does not reset with one.
  { href: '/registrar/fees', label: 'Match official fees', seasonScoped: false, group: 'Money' },
  { href: '/registrar/arrears', label: 'Arrears', seasonScoped: false, group: 'Money' },
  { href: '/registrar/sponsors', label: 'Sponsors', seasonScoped: false, group: 'Money' },
  { href: '/registrar/governance', label: 'Governance', seasonScoped: false, group: 'Club' },
  { href: '/registrar/committee-hub', label: 'Committee hub', seasonScoped: false, group: 'Club' },
  { href: '/registrar/privacy', label: 'Privacy', seasonScoped: false, group: 'Club' },
  { href: '/registrar/access', label: 'Access', seasonScoped: false, group: 'Club' },
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

/** A link in the site's top bar or footer (scope 104). */
export interface SiteLink {
  readonly href: string;
  readonly label: string;
}

/**
 * The top bar's destinations: only screens that exist. The bar is on every
 * screen, so the design's links to sections of the landing page would mean
 * nothing anywhere else.
 */
export const SITE_NAV: readonly SiteLink[] = [
  { href: '/seasons', label: 'Season calendars' },
  { href: '/registrar', label: 'Club administration' },
  { href: '/demo', label: 'Demonstration club' },
  { href: '/interest', label: 'For clubs' },
];

/**
 * Where the design put Sign in. The layout is prerendered and makes no auth
 * call, so a Sign in link would be offered to people already signed in;
 * `/me` sends whoever is signed out to sign-in, and everyone else to their
 * roles.
 */
export const WORKSPACE_LINK: SiteLink = { href: '/me', label: 'Your workspace' };
export const REGISTER_LINK: SiteLink = { href: '/register', label: 'Register' };

/** No Legal column: there is no privacy or terms page yet (scope 104). */
export const FOOTER_NAV: readonly { readonly heading: string; readonly links: readonly SiteLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '/seasons', label: 'Season calendars' },
      { href: '/register', label: 'Start a registration' },
      { href: '/me', label: 'Your workspace' },
    ],
  },
  {
    heading: 'Clubs',
    links: [
      { href: '/interest', label: 'Talk to us' },
      { href: '/demo', label: 'Demonstration club' },
      { href: '/registrar', label: 'Club administration' },
    ],
  },
];
