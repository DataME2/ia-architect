/**
 * What the guardian's "confirm the match" panel decides, as pure functions
 * (BR151).
 *
 * Age is taken as an argument, never read from a clock, for the reason
 * `designation-answer.ts`'s `isAdultOn` gives: a function that reached for
 * `new Date()` would answer a different question each time it ran and
 * could not be tested at all.
 */

/**
 * Whether this official was under thirteen **on the day of the fixture** —
 * BR151's gate, measured against the match rather than today. This is a
 * fact about a Saturday that already happened, not a decision whose
 * authority could shift under it, the opposite of `isAdultOn`'s "measured
 * now" reasoning for BR113.
 */
export function wasUnderThirteenOn(dateOfBirth: string | null, playedOn: string): boolean {
  if (dateOfBirth === null || dateOfBirth === '') return false; // unknown: not offered
  const parts = dateOfBirth.split('-');
  if (parts.length !== 3) return false;
  const [y, m, d] = parts.map(Number) as [number, number, number];
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  const thirteenth = `${String(y + 13).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return thirteenth > playedOn;
}

export interface ParsedScore {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
}

export type ParsedConfirmation =
  | ({ readonly ok: true; readonly fixtureId: string; readonly personId: string } & ParsedScore)
  | { readonly ok: false; readonly message: string };

/** BR151: the score is optional and, when given, never negative. */
export function parseMatchConfirmation(fields: {
  readonly fixtureId?: string | null;
  readonly personId?: string | null;
  readonly homeScore?: string | null;
  readonly awayScore?: string | null;
}): ParsedConfirmation {
  const fixtureId = (fields.fixtureId ?? '').trim();
  const personId = (fields.personId ?? '').trim();
  if (fixtureId === '' || personId === '') return { ok: false, message: 'Nothing to confirm.' };

  const parseOne = (raw: string | null | undefined): number | null | 'invalid' => {
    const trimmed = (raw ?? '').trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (!Number.isInteger(n) || n < 0) return 'invalid';
    return n;
  };

  const home = parseOne(fields.homeScore);
  const away = parseOne(fields.awayScore);
  if (home === 'invalid' || away === 'invalid') {
    return { ok: false, message: 'A score is a whole number, zero or more.' };
  }

  return { ok: true, fixtureId, personId, homeScore: home, awayScore: away };
}
