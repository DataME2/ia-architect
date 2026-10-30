/**
 * An official's season in figures (scope 126, WP1), computed from the
 * recorded appointments and never stored, so they cannot drift from them.
 *
 * - **Reliability** is the matches officiated out of the commitments that
 *   have come due: an accepted match whose day has passed, or one the
 *   official withdrew from. A match still to come proves nothing yet.
 * - **The cancellation rate** is the withdrawals out of everything the
 *   official accepted. A withdrawal always carries its reason, because the
 *   database refuses one without (BR42, BR112). A decline is not a
 *   cancellation: saying no to an offer is availability, and BR12 already
 *   governs it against a configured maximum.
 * - A fixture that was cancelled, abandoned or forfeited is nobody's
 *   reliability, so it counts in neither direction.
 *
 * Hours wait for match lengths from the governing body (open question 120).
 */
export type AppointmentState = 'proposed' | 'accepted' | 'declined' | 'withdrawn';

export interface AppointmentFact {
  readonly state: AppointmentState;
  /** The fixture's date, `YYYY-MM-DD`. */
  readonly playedOn: string;
  readonly fixtureStatus: string;
}

export interface OfficialFigures {
  readonly officiated: number;
  readonly withdrawn: number;
  readonly upcoming: number;
  readonly declined: number;
  /** A whole percentage, or null while nothing has come due. */
  readonly reliability: number | null;
  /** A whole percentage, or null while nothing has been accepted. */
  readonly cancellationRate: number | null;
}

const VOID = new Set(['cancelled', 'abandoned', 'forfeited']);

function percent(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export function officialFigures(rows: readonly AppointmentFact[], today: string): OfficialFigures {
  const counted = rows.filter((r) => !VOID.has(r.fixtureStatus));
  const accepted = counted.filter((r) => r.state === 'accepted');
  const officiated = accepted.filter((r) => r.playedOn < today).length;
  const upcoming = accepted.length - officiated + counted.filter((r) => r.state === 'proposed' && r.playedOn >= today).length;
  const withdrawn = counted.filter((r) => r.state === 'withdrawn').length;
  const declined = counted.filter((r) => r.state === 'declined').length;
  return {
    officiated,
    withdrawn,
    upcoming,
    declined,
    reliability: percent(officiated, officiated + withdrawn),
    cancellationRate: percent(withdrawn, accepted.length + withdrawn),
  };
}

/** The history's word for a row: the state, with a past acceptance read as officiated. */
export function historyWord(row: AppointmentFact, today: string): { readonly word: string; readonly tone: 'ok' | 'warn' | 'stop' | 'neutral' } {
  if (VOID.has(row.fixtureStatus)) return { word: 'Match not played', tone: 'neutral' };
  switch (row.state) {
    case 'accepted':
      return row.playedOn < today ? { word: 'Officiated', tone: 'ok' } : { word: 'Accepted', tone: 'ok' };
    case 'proposed':
      return { word: 'Offered', tone: 'warn' };
    case 'declined':
      return { word: 'Declined with a reason', tone: 'neutral' };
    case 'withdrawn':
      return { word: 'Withdrawn', tone: 'stop' };
  }
}
