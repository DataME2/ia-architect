/**
 * The platform console's decisions, kept out of the page like every other
 * screen's.
 *
 * See `docs/decisions/9_platform_administration_provisions_but_never_reads.md`.
 */

export interface PlatformClub {
  readonly clubId: string;
  readonly name: string;
  readonly jurisdiction: string;
  readonly createdAt: string;
  readonly adminCount: number;
  readonly seasonCount: number;
}

export type ProvisionParse =
  | { readonly ok: true; readonly draft: ProvisionDraft }
  | { readonly ok: false; readonly error: string };

export interface ProvisionDraft {
  readonly name: string;
  readonly jurisdiction: string;
  readonly adminEmail: string | null;
  readonly seasonName: string | null;
  readonly seasonStarts: string | null;
  readonly seasonEnds: string | null;
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
  if (club.adminCount === 0) gaps.push('no administrator — nobody can sign in');
  if (club.seasonCount === 0) gaps.push('no season — registrations cannot be created');
  return gaps;
}

export function parseProvision(form: {
  name: unknown;
  jurisdiction: unknown;
  adminEmail: unknown;
  seasonName: unknown;
  seasonStarts: unknown;
  seasonEnds: unknown;
}): ProvisionParse {
  const name = String(form.name ?? '').trim();
  const jurisdiction = String(form.jurisdiction ?? '').trim();
  const adminEmail = String(form.adminEmail ?? '').trim().toLowerCase();
  const seasonName = String(form.seasonName ?? '').trim();
  const seasonStarts = String(form.seasonStarts ?? '').trim();
  const seasonEnds = String(form.seasonEnds ?? '').trim();

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

  if (adminEmail !== '' && !adminEmail.includes('@')) {
    return { ok: false, error: 'That does not look like an email address.' };
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
      adminEmail: adminEmail === '' ? null : adminEmail,
      seasonName: seasonName === '' ? null : seasonName,
      seasonStarts: seasonStarts === '' ? null : seasonStarts,
      seasonEnds: seasonEnds === '' ? null : seasonEnds,
    },
  };
}
