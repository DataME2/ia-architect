/**
 * What the fee-schedule editor decides, as pure functions.
 *
 * The schema and the rate resolution have existed since migration 0026 and
 * `src/domain/officiating/fees.ts`. What has never existed is a way for a
 * club to **author** a schedule, so no club has any rates, so
 * `rateFor` returns `none` for every appointment and no official can be
 * paid at all. That is scope 34's WP2, and this is the deciding half of it.
 *
 * **Nothing here re-implements pricing.** `rateFor` is the one definition
 * of what a game pays; these functions are about the table a club types
 * in — parsing a cell, refusing a duplicate before the database has to, and
 * saying which schedule is in force.
 */
import { parseAmountCents } from './money.ts';
import type { AppointedBy, FeeRate, OfficialRole } from '../domain/officiating/fees.ts';

export const OFFICIAL_ROLES: readonly OfficialRole[] = [
  'referee',
  'assistant_referee',
  'fourth_official',
];

const ROLE_LABEL: Readonly<Record<OfficialRole, string>> = {
  referee: 'Referee',
  assistant_referee: 'Assistant referee',
  fourth_official: 'Fourth official',
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role as OfficialRole] ?? role;
}

/** How a cell that names nothing in a dimension reads on screen. */
export const ANY = 'Any';

export function dimensionLabel(value: string | null): string {
  return value === null || value.trim() === '' ? ANY : value;
}

export type ParsedSchedule =
  | { readonly ok: true; readonly effectiveFrom: string; readonly note: string | null }
  | { readonly ok: false; readonly error: string };

/**
 * A new schedule's date and note.
 *
 * BR115 makes a schedule a **dated version, not an edited row**: raising the
 * assistant referee rate in July does not change what the club owed in May.
 * So the date is required and is the whole of the schedule's identity — and
 * the editor never offers to change an existing one's rates in place.
 */
export function parseSchedule(fields: {
  readonly effectiveFrom?: string | null;
  readonly note?: string | null;
}): ParsedSchedule {
  const effectiveFrom = (fields.effectiveFrom ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { ok: false, error: 'Give the date this schedule starts from, as YYYY-MM-DD.' };
  }

  const note = (fields.note ?? '').trim();
  return { ok: true, effectiveFrom, note: note === '' ? null : note };
}

export type ParsedRate =
  | { readonly ok: true; readonly rate: FeeRate }
  | { readonly ok: false; readonly error: string };

/**
 * One cell of the club's table.
 *
 * Empty is `null` and `null` means *any*, so a club paying the same for
 * every competition writes one row rather than one per competition. Blank
 * and "any" are the same answer, and both are ordinary.
 */
export function parseRate(fields: {
  readonly role?: string | null;
  readonly competition?: string | null;
  readonly classification?: string | null;
  readonly appointedBy?: string | null;
  readonly amount?: string | null;
}): ParsedRate {
  const role = (fields.role ?? '').trim();
  if (!OFFICIAL_ROLES.includes(role as OfficialRole)) {
    return { ok: false, error: 'Choose which official this rate is for.' };
  }

  const appointedByRaw = (fields.appointedBy ?? '').trim();
  if (appointedByRaw !== '' && appointedByRaw !== 'club' && appointedByRaw !== 'association') {
    return { ok: false, error: 'Appointed by the club, the association, or either.' };
  }

  const amount = parseAmountCents(fields.amount ?? '');
  if (!amount.ok) return { ok: false, error: amount.error };
  // A negative rate is not a credit here, unlike a family's balance: it
  // would mean the official pays the club to referee.
  if (amount.cents < 0) return { ok: false, error: 'A rate cannot be negative.' };

  return {
    ok: true,
    rate: {
      role: role as OfficialRole,
      competition: blankToNull(fields.competition),
      classification: blankToNull(fields.classification),
      appointedBy: appointedByRaw === '' ? null : (appointedByRaw as AppointedBy),
      amountCents: amount.cents,
    },
  };
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Whether this cell has already been defined in the schedule.
 *
 * The database refuses it — `unique nulls not distinct` on 0026 — and this
 * exists so the club is told *which* row clashes rather than reading a
 * constraint name. Compared the way `rateFor` compares, case-insensitively
 * and trimmed, because "Div 3" and "div 3 " are not two competitions.
 */
export function duplicateOf(
  existing: readonly FeeRate[],
  candidate: FeeRate,
): FeeRate | null {
  return existing.find((r) =>
    r.role === candidate.role
    && sameCell(r.competition, candidate.competition)
    && sameCell(r.classification, candidate.classification)
    && r.appointedBy === candidate.appointedBy) ?? null;
}

function sameCell(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type ScheduleStanding = 'in-force' | 'superseded' | 'future';

export interface ScheduleRow {
  readonly id: string;
  readonly effectiveFrom: string;
  readonly note: string | null;
  readonly rateCount: number;
}

export interface StandingSchedule extends ScheduleRow {
  readonly standing: ScheduleStanding;
}

/**
 * Which schedule is in force, which is history, and which has not started.
 *
 * The same rule `app_fee_schedule_on` applies — the latest schedule that
 * had started by the date asked about — restated here because a screen that
 * showed three schedules without saying which one is being used is a screen
 * that invites a club to edit the wrong one.
 *
 * Newest first, because a club that has just published one wants to see it.
 */
export function standings(
  schedules: readonly ScheduleRow[],
  asOf: string,
): readonly StandingSchedule[] {
  const ordered = schedules
    .slice()
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

  const inForce = ordered.find((s) => s.effectiveFrom <= asOf);

  return ordered.map((s) => ({
    ...s,
    standing: s.effectiveFrom > asOf
      ? 'future'
      : s.id === inForce?.id
        ? 'in-force'
        : 'superseded',
  }));
}

/**
 * What a club should be told before it trusts the editor.
 *
 * A schedule with no rates prices nothing, and a role with no rate prices
 * nothing for that role — both look like a finished table on screen and
 * both produce `rateFor` → `none` at the moment a treasurer raises a claim.
 * Saying so on the page is the difference between a club finding out now
 * and finding out at the end of the season.
 */
export function gaps(rates: readonly FeeRate[]): readonly string[] {
  if (rates.length === 0) {
    return ['This schedule has no rates yet, so nothing can be claimed against it.'];
  }

  const missing = OFFICIAL_ROLES.filter((role) => !rates.some((r) => r.role === role));
  if (missing.length === 0) return [];

  return [
    `No rate for ${missing.map(roleLabel).map((l) => l.toLowerCase()).join(' or ')}. `
    + 'A claim for one of those will find no rate at all, rather than a rate of zero.',
  ];
}
