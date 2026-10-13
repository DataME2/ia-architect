/**
 * The top bar's decisions (scope 93): where a person can jump from the
 * command bar, how what they type maps to a destination, and the lens the
 * acting-as chip names on a club screen.
 *
 * The bar **finds**; it does not answer. Every destination is a page that
 * already exists and already decides who may see it: the root layout makes
 * no auth call, so the bar offers the same places to everyone, and a club
 * screen still sends a non-member to sign in. People search hands the text
 * to `/registrar/people?q=`, which RLS scopes to the searcher's club (P5).
 */
import { accessLabel } from './access-view.ts';
import { REGISTRAR_NAV, type NavItem } from './nav.ts';

export type DestinationGroup = 'Go to' | 'Club administration' | 'Search';

export interface Destination {
  readonly label: string;
  readonly href: string;
  readonly group: DestinationGroup;
  /** Extra words that should find it ("money" finds Arrears). */
  readonly keywords?: readonly string[];
}

/**
 * Places anyone can reach; each page decides for itself what follows. No
 * "Sign in": the layout cannot know who already is (see its masthead).
 */
export const PERSON_DESTINATIONS: readonly Destination[] = [
  { label: 'Home', href: '/', group: 'Go to' },
  { label: 'Your roles', href: '/me', group: 'Go to', keywords: ['me', 'profile', 'player', 'coach', 'referee', 'guardian', 'committee', 'inbox'] },
  { label: 'Start a registration', href: '/register', group: 'Go to', keywords: ['register', 'sign up', 'new player', 'join'] },
  { label: 'Which club am I in?', href: '/demo', group: 'Go to', keywords: ['demo', 'demonstration'] },
  { label: 'Talk to us about your club', href: '/interest', group: 'Go to', keywords: ['enquiry', 'contact', 'interest'] },
];

const CLUB_KEYWORDS: Readonly<Record<string, readonly string[]>> = {
  '/registrar': ['queue', 'registrations', 'blocked'],
  '/registrar/arrears': ['money', 'owed', 'fees', 'debt', 'unpaid'],
  '/registrar/referees': ['officials', 'referee'],
  '/registrar/referee-payments': ['claims', 'pay', 'officials'],
  '/registrar/governance': ['committee', 'agm', 'minutes'],
  '/registrar/privacy': ['erasure', 'consent', 'retention'],
  '/registrar/pack': ['submission', 'federation'],
  '/registrar/people': ['person', 'search', 'members'],
};

/** The club menu's own destinations, from the one list `nav.ts` keeps. */
export function clubDestinations(nav: readonly NavItem[] = REGISTRAR_NAV): readonly Destination[] {
  return nav.map((i) => ({ label: i.label, href: i.href, group: 'Club administration' as const, keywords: CLUB_KEYWORDS[i.href] ?? [] }));
}

/** How well a destination matches: 3 starts the label, 2 starts a word, 1 contains, 0 no. */
export function score(d: Destination, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const label = d.label.toLowerCase();
  if (label.startsWith(q)) return 3;
  if (label.split(/\s+/).some((w) => w.startsWith(q))) return 2;
  if (label.includes(q) || (d.keywords ?? []).some((k) => k.startsWith(q) || k.includes(q))) return 1;
  return 0;
}

/**
 * What the bar lists for a query. Empty: a short list of the common places.
 * Otherwise matches best first, then, for two or more characters, a people
 * search, always last so it never hides a place that matched by name.
 */
export function commandResults(query: string, all: readonly Destination[] = [...PERSON_DESTINATIONS, ...clubDestinations()], limit = 8): readonly Destination[] {
  const q = query.trim();
  if (!q) return all.filter((d) => ['/me', '/registrar', '/register', '/registrar/people'].includes(d.href));
  const hits = all
    .map((d, i) => ({ d, s: score(d, q), i }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.d)
    .slice(0, limit);
  return q.length >= 2 ? [...hits, peopleSearch(q)] : hits;
}

export function peopleSearch(query: string): Destination {
  return { label: `Search people for “${query.trim()}”`, href: `/registrar/people?q=${encodeURIComponent(query.trim())}`, group: 'Search' };
}


/**
 * The acting-as chip's lens on a club screen: every club role the person
 * holds there, because on club screens they all apply at once. "Registrar
 * and Treasurer"; "Administrator, Registrar and Treasurer".
 */
export function clubLens(roles: readonly string[]): string {
  const names = roles.map(accessLabel);
  if (names.length === 0) return 'Member';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
