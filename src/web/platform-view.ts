/**
 * The platform console's decisions, kept out of the page like every other
 * screen's.
 *
 * See `docs/decisions/9_platform_administration_provisions_but_never_reads.md`.
 */

export interface ClubContact {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  /** True once they have signed in and their access exists. */
  readonly claimed: boolean;
}

export interface PlatformClub {
  readonly clubId: string;
  readonly name: string;
  readonly jurisdiction: string;
  readonly createdAt: string;
  readonly adminCount: number;
  readonly seasonCount: number;
  readonly primary: ClubContact | null;
  readonly secondary: ClubContact | null;
}

export type ProvisionParse =
  | { readonly ok: true; readonly draft: ProvisionDraft }
  | { readonly ok: false; readonly error: string };

export interface ProvisionDraft {
  readonly name: string;
  readonly jurisdiction: string;
  readonly seasonName: string | null;
  readonly seasonStarts: string | null;
  readonly seasonEnds: string | null;
  readonly primaryName: string;
  readonly primaryEmail: string;
  readonly primaryPhone: string | null;
  readonly secondaryName: string | null;
  readonly secondaryEmail: string | null;
  readonly secondaryPhone: string | null;
}

/** The jurisdictions the platform serves. BR52 turns on this value. */
export const JURISDICTIONS = [
  'AU-QLD',
  'AU-NSW',
  'AU-VIC',
  'AU-SA',
  'AU-WA',
  'AU-TAS',
  'AU-ACT',
  'AU-NT',
  'NZ',
] as const;

/**
 * What a club still needs before anybody can use it.
 *
 * Provisioning can legitimately stop half way — an administrator who has
 * not signed up yet is the common case — so an incomplete club is a normal
 * state to display rather than an error to hide.
 */
export function outstanding(club: PlatformClub): readonly string[] {
  const gaps: string[] = [];

  // An unclaimed invitation is a normal waiting state, not a fault: the
  // club has been told, and the person has not arrived yet. Said as
  // "waiting" rather than "missing" so the owner does not chase what is
  // already in somebody's inbox.
  if (club.primary === null) gaps.push('no responsible person recorded');
  else if (!club.primary.claimed) gaps.push(`waiting for ${club.primary.email} to sign in`);

  if (club.secondary !== null && !club.secondary.claimed) {
    gaps.push(`waiting for ${club.secondary.email} to sign in`);
  }

  if (club.adminCount === 0) gaps.push('nobody can sign in yet');
  if (club.seasonCount === 0) gaps.push('no season — registrations cannot be created');
  return gaps;
}

/**
 * Whether a club has a second responsible person.
 *
 * Worth surfacing on its own: a club with one administrator cannot remove
 * that administrator (the last-admin guard in `revoke_club_role` refuses),
 * and cannot get in at all if they leave. A deputy is the insurance, and a
 * club without one is a support call waiting to happen.
 */
export function hasDeputy(club: PlatformClub): boolean {
  return club.secondary !== null;
}

export function parseProvision(form: {
  name: unknown;
  jurisdiction: unknown;
  seasonName: unknown;
  seasonStarts: unknown;
  seasonEnds: unknown;
  primaryName: unknown;
  primaryEmail: unknown;
  primaryPhone: unknown;
  secondaryName: unknown;
  secondaryEmail: unknown;
  secondaryPhone: unknown;
}): ProvisionParse {
  const name = String(form.name ?? '').trim();
  const jurisdiction = String(form.jurisdiction ?? '').trim();
  const seasonName = String(form.seasonName ?? '').trim();
  const seasonStarts = String(form.seasonStarts ?? '').trim();
  const seasonEnds = String(form.seasonEnds ?? '').trim();
  const primaryName = String(form.primaryName ?? '').trim();
  const primaryEmail = String(form.primaryEmail ?? '').trim().toLowerCase();
  const primaryPhone = String(form.primaryPhone ?? '').trim();
  const secondaryName = String(form.secondaryName ?? '').trim();
  const secondaryEmail = String(form.secondaryEmail ?? '').trim().toLowerCase();
  const secondaryPhone = String(form.secondaryPhone ?? '').trim();

  if (name === '') return { ok: false, error: 'Enter the club’s name.' };

  // Refused here as well as in the database. The database is the control;
  // this is so the answer arrives before the round trip.
  if (name.toUpperCase().includes('(DEMO)')) {
    return {
      ok: false,
      error: 'A demonstration club is seeded by supabase/demo/seed.sql, not provisioned here.',
    };
  }

  if (!(JURISDICTIONS as readonly string[]).includes(jurisdiction)) {
    return { ok: false, error: 'Choose a jurisdiction — it decides the club’s privacy framework (BR52).' };
  }

  // A club with nobody answerable for it is how a tenant becomes nobody's
  // problem, so this is required where the season is not.
  if (primaryName === '' || primaryEmail === '') {
    return { ok: false, error: 'A club needs a responsible person — a name and an email address.' };
  }
  if (!primaryEmail.includes('@')) {
    return { ok: false, error: 'That does not look like an email address for the main contact.' };
  }

  if (secondaryEmail !== '' || secondaryName !== '') {
    if (secondaryName === '' || secondaryEmail === '') {
      return { ok: false, error: 'A second responsible person needs both a name and an email address.' };
    }
    if (!secondaryEmail.includes('@')) {
      return { ok: false, error: 'That does not look like an email address for the second contact.' };
    }
    if (secondaryEmail === primaryEmail) {
      return {
        ok: false,
        error: 'The second person must be somebody else — the point is that they are reachable when the first is not.',
      };
    }
  }

  if (seasonName !== '') {
    if (seasonStarts === '' || seasonEnds === '') {
      return { ok: false, error: 'A season needs both a start and an end date.' };
    }
    if (seasonEnds <= seasonStarts) {
      return { ok: false, error: 'The season ends before it starts.' };
    }
  }

  return {
    ok: true,
    draft: {
      name,
      jurisdiction,
      seasonName: seasonName === '' ? null : seasonName,
      seasonStarts: seasonStarts === '' ? null : seasonStarts,
      seasonEnds: seasonEnds === '' ? null : seasonEnds,
      primaryName,
      primaryEmail,
      primaryPhone: primaryPhone === '' ? null : primaryPhone,
      secondaryName: secondaryName === '' ? null : secondaryName,
      secondaryEmail: secondaryEmail === '' ? null : secondaryEmail,
      secondaryPhone: secondaryPhone === '' ? null : secondaryPhone,
    },
  };
}

export type LicenceState = 'trial' | 'active' | 'suspended' | 'ended';

export interface ClubLicence {
  readonly state: LicenceState;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly feeCents: number | null;
  readonly currency: string;
  readonly note: string | null;
}

/**
 * What a licence is doing *today*, which is not the same as what state it
 * was recorded in.
 *
 * A licence recorded `active` whose term ended last week is **lapsed**, and
 * calling it active because a column says so is how a business loses track
 * of who is paying. The date is the fact; the state is the intent.
 */
export type LicenceStanding =
  | { readonly kind: 'none' }
  | { readonly kind: 'trial'; readonly daysLeft: number }
  | { readonly kind: 'active'; readonly daysLeft: number }
  | { readonly kind: 'expiring'; readonly daysLeft: number }
  | { readonly kind: 'lapsed'; readonly daysAgo: number }
  | { readonly kind: 'suspended' }
  | { readonly kind: 'ended' };

/** Inside this many days of the end, a renewal conversation is overdue. */
export const RENEWAL_WINDOW_DAYS = 60;

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  // Date.UTC takes a 0-indexed month; passing the calendar month through
  // shifts both dates and quietly does not cancel across unequal months.
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function standing(licence: ClubLicence | null, today: string): LicenceStanding {
  if (licence === null) return { kind: 'none' };
  if (licence.state === 'suspended') return { kind: 'suspended' };
  if (licence.state === 'ended') return { kind: 'ended' };

  const daysLeft = daysBetween(today, licence.endsOn);
  if (daysLeft < 0) return { kind: 'lapsed', daysAgo: -daysLeft };
  if (licence.state === 'trial') return { kind: 'trial', daysLeft };
  if (daysLeft <= RENEWAL_WINDOW_DAYS) return { kind: 'expiring', daysLeft };
  return { kind: 'active', daysLeft };
}

/** Whether this club is entitled to use the product right now. */
export function isLicensed(standing: LicenceStanding): boolean {
  return standing.kind === 'active' || standing.kind === 'expiring' || standing.kind === 'trial';
}

export interface PlatformSummary {
  readonly supported: number;
  readonly licensed: number;
  readonly trialling: number;
  readonly expiring: number;
  readonly lapsed: number;
  readonly unlicensed: number;
  readonly annualValueCents: number;
}

/**
 * The counts the console leads with.
 *
 * **The demonstration club is excluded from every one of them.** It is ours,
 * not a customer, and counting it would overstate the business by one club
 * for as long as the demo exists — a small lie that compounds into a wrong
 * number on a slide.
 */
export function summarise(
  clubs: readonly (PlatformClub & { readonly licence: ClubLicence | null; readonly isDemo: boolean })[],
  today: string,
): PlatformSummary {
  const real = clubs.filter((c) => !c.isDemo);
  let licensed = 0;
  let trialling = 0;
  let expiring = 0;
  let lapsed = 0;
  let unlicensed = 0;
  let annualValueCents = 0;

  for (const club of real) {
    const s = standing(club.licence, today);
    if (s.kind === 'trial') trialling += 1;
    if (s.kind === 'expiring') expiring += 1;
    if (s.kind === 'lapsed') lapsed += 1;
    if (s.kind === 'none') unlicensed += 1;
    if (isLicensed(s)) {
      licensed += 1;
      // Only money actually agreed. A trial with no fee contributes
      // nothing, which is the honest number.
      if (club.licence?.feeCents != null) annualValueCents += club.licence.feeCents;
    }
  }

  return {
    supported: real.length,
    licensed,
    trialling,
    expiring,
    lapsed,
    unlicensed,
    annualValueCents,
  };
}
