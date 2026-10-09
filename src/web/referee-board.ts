/**
 * The referee board (scope 90): the official's own week as a grid, an alert
 * for each upcoming appointment, and the ledger of what they are owed.
 *
 * Pure, so the grid's round trip, every alert's reason and every ledger
 * line are unit tests. The rules are the database's (BR7, BR10, BR54, BR111,
 * BR174); this decides how each is shown, and never offers what it refuses.
 */
import { formatMoney } from '../domain/finance/money.ts';
import { WEEKDAYS, shortTime, type AvailabilityWindow, type UnavailabilityRange } from './availability-view.ts';

// ------------------------------------------------------------------ the grid

/** Three parts of a football day. Times are the window's own bounds. */
export const SLOTS = [
  { key: 'morning', label: 'Morning', from: '06:00', to: '12:00' },
  { key: 'afternoon', label: 'Afternoon', from: '12:00', to: '17:00' },
  { key: 'evening', label: 'Evening', from: '17:00', to: '22:00' },
] as const;

export type SlotKey = (typeof SLOTS)[number]['key'];

/** The grid's rows, Monday first, the way a club's week reads. Weekday 0 is Sunday. */
export const GRID_DAYS: readonly { readonly weekday: number; readonly label: string }[] = [1, 2, 3, 4, 5, 6, 0].map(
  (weekday) => ({ weekday, label: WEEKDAYS[weekday]! }),
);

/** A cell is `weekday:slot`, e.g. `6:morning`. */
export function cellKey(weekday: number, slot: SlotKey): string {
  return `${weekday}:${slot}`;
}

/**
 * Which cells the declared windows cover. A window covers a cell when it
 * overlaps it at all; `custom` says some window does not line up with the
 * slots, so saving the grid would round it to them.
 */
export function gridFromWindows(windows: readonly Pick<AvailabilityWindow, 'weekday' | 'fromTime' | 'toTime'>[]): {
  readonly cells: ReadonlySet<string>;
  readonly custom: boolean;
} {
  const cells = new Set<string>();
  let custom = false;
  for (const w of windows) {
    const from = shortTime(w.fromTime) ?? '00:00';
    const to = shortTime(w.toTime) ?? '23:59';
    const whole = w.fromTime === null && w.toTime === null;
    let exact = whole;
    for (const s of SLOTS) {
      if (from < s.to && s.from < to) cells.add(cellKey(w.weekday, s.key));
    }
    if (!whole) {
      const covered = SLOTS.filter((s) => from < s.to && s.from < to);
      exact = covered.length > 0 && covered[0]!.from === from && covered[covered.length - 1]!.to === to;
    }
    if (!exact) custom = true;
  }
  return { cells, custom };
}

export interface GridWindow {
  readonly weekday: number;
  /** Null for the whole day. */
  readonly from_time: string | null;
  readonly to_time: string | null;
}

/**
 * The windows a grid means, as `app_set_my_availability()` takes them.
 * Adjacent slots merge into one window; all three are the whole day.
 */
export function windowsFromGrid(cells: ReadonlySet<string>): readonly GridWindow[] {
  const out: GridWindow[] = [];
  for (const { weekday } of GRID_DAYS) {
    const on = SLOTS.map((s) => cells.has(cellKey(weekday, s.key)));
    if (on.every(Boolean)) {
      out.push({ weekday, from_time: null, to_time: null });
      continue;
    }
    let i = 0;
    while (i < SLOTS.length) {
      if (!on[i]) {
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 < SLOTS.length && on[j + 1]) j += 1;
      out.push({ weekday, from_time: SLOTS[i]!.from, to_time: SLOTS[j]!.to });
      i = j + 1;
    }
  }
  return out;
}

/** Read the grid's submitted cells, keeping only real ones. */
export function parseCells(raw: string): ReadonlySet<string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const valid = new Set(GRID_DAYS.flatMap((d) => SLOTS.map((s) => cellKey(d.weekday, s.key))));
  return new Set(parsed.filter((c): c is string => typeof c === 'string' && valid.has(c)));
}

// --------------------------------------------------- the conflict and card check

export type AlertTone = 'clear' | 'check' | 'blocked';

export interface UpcomingAppointment {
  readonly id: string;
  readonly opponent: string;
  readonly playedOn: string;
  /** `HH:MM[:SS]`, or null when the club has not set one. */
  readonly kickOff: string | null;
  readonly role: string;
  readonly state: 'proposed' | 'accepted' | 'declined' | 'withdrawn';
}

export interface Credential {
  readonly label: string;
  readonly expiresOn: string | null;
  readonly sighted: boolean;
}

export interface AlertReason {
  readonly rule: string;
  readonly text: string;
  readonly tone: Exclude<AlertTone, 'clear'>;
}

export interface AppointmentAlert {
  readonly appointment: UpcomingAppointment;
  readonly tone: AlertTone;
  readonly reasons: readonly AlertReason[];
}

const weekdayOf = (iso: string): number => new Date(`${iso}T00:00:00Z`).getUTCDay();

function minutes(time: string): number {
  const [h = '0', m = '0'] = time.split(':');
  return Number(h) * 60 + Number(m);
}

/** Within two hours of each other, or either unknown: a match lasts that long. */
function mayOverlap(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return true;
  return Math.abs(minutes(a) - minutes(b)) < 120;
}

function withinWindows(windows: readonly Pick<AvailabilityWindow, 'weekday' | 'fromTime' | 'toTime'>[], playedOn: string, kickOff: string | null): boolean {
  const day = weekdayOf(playedOn);
  return windows.some((w) => {
    if (w.weekday !== day) return false;
    if (kickOff === null) return true;
    const k = shortTime(kickOff)!;
    return (shortTime(w.fromTime) ?? '00:00') <= k && k <= (shortTime(w.toTime) ?? '23:59');
  });
}

/**
 * Every upcoming appointment that is still live (offered or accepted), with
 * what stands against it, worst first. **Red** means the database or the
 * official's own record rules it out on the day; **amber** means somebody
 * should look; **green** means nothing found.
 *
 * BR6 and BR109 never appear: a match the official plays in, coaches or has
 * a child in is never offered at all. BR8 needs the competition's minimum,
 * which the coordinator checks at appointment.
 */
export function appointmentAlerts(
  appointments: readonly UpcomingAppointment[],
  context: {
    readonly today: string;
    readonly credentials: readonly Credential[];
    readonly windows: readonly Pick<AvailabilityWindow, 'weekday' | 'fromTime' | 'toTime'>[];
    readonly away: readonly Pick<UnavailabilityRange, 'startsOn' | 'endsOn'>[];
  },
): readonly AppointmentAlert[] {
  const live = appointments
    .filter((a) => (a.state === 'proposed' || a.state === 'accepted') && a.playedOn >= context.today)
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || (a.kickOff ?? '').localeCompare(b.kickOff ?? ''));

  const toneRank: Readonly<Record<AlertTone, number>> = { blocked: 0, check: 1, clear: 2 };

  return live.map((a) => {
    const reasons: AlertReason[] = [];

    if (context.away.some((r) => r.startsOn <= a.playedOn && a.playedOn <= r.endsOn)) {
      reasons.push({ rule: 'BR174', tone: 'blocked', text: 'You recorded being away that day.' });
    }

    for (const c of context.credentials) {
      if (c.expiresOn !== null && c.expiresOn < a.playedOn) {
        reasons.push({ rule: 'BR111', tone: 'blocked', text: `${c.label} expires ${c.expiresOn}, before the match.` });
      } else if (!c.sighted) {
        reasons.push({ rule: 'BR10', tone: 'check', text: `${c.label} is not yet sighted by the club.` });
      }
    }

    for (const other of live) {
      if (other.id === a.id || other.playedOn !== a.playedOn) continue;
      if (a.kickOff !== null && other.kickOff !== null && shortTime(a.kickOff) === shortTime(other.kickOff)) {
        reasons.push({ rule: 'BR7', tone: 'blocked', text: `Same kick-off as the match against ${other.opponent}.` });
      } else if (mayOverlap(a.kickOff, other.kickOff)) {
        reasons.push({ rule: 'BR7', tone: 'check', text: `Close to the match against ${other.opponent} the same day.` });
      }
    }

    if (context.windows.length === 0) {
      reasons.push({ rule: 'BR174', tone: 'check', text: 'You have not declared any availability this season.' });
    } else if (!withinWindows(context.windows, a.playedOn, a.kickOff)) {
      reasons.push({ rule: 'BR174', tone: 'check', text: 'Outside the availability you declared.' });
    }

    reasons.sort((x, y) => toneRank[x.tone] - toneRank[y.tone]);
    const tone: AlertTone = reasons.some((r) => r.tone === 'blocked') ? 'blocked' : reasons.length > 0 ? 'check' : 'clear';
    return { appointment: a, tone, reasons };
  });
}

// ------------------------------------------------------------------ the ledger

export type LedgerStatus = 'pending' | 'approved' | 'batched' | 'paid' | 'rejected';

export interface LedgerClaim {
  readonly id: string;
  readonly opponent: string;
  readonly playedOn: string;
  readonly amountCents: number;
  readonly state: 'raised' | 'approved' | 'rejected';
  readonly batchId: string | null;
}

export interface LedgerLine {
  readonly id: string;
  readonly match: string;
  readonly playedOn: string;
  readonly amount: string;
  readonly status: LedgerStatus;
  readonly label: string;
  /** The payout's reference: `SIM-…` while payouts are simulated. */
  readonly reference: string | null;
}

/** Each claim on one line, newest match first, and the totals a person asks about. */
export function ledger(
  claims: readonly LedgerClaim[],
  payouts: ReadonlyMap<string, { readonly reference: string; readonly simulated: boolean }>,
): { readonly lines: readonly LedgerLine[]; readonly owed: string; readonly paid: string } {
  let owed = 0;
  let paid = 0;
  const lines = [...claims]
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn))
    .map((c): LedgerLine => {
      const payout = payouts.get(c.id) ?? null;
      let status: LedgerStatus;
      let label: string;
      if (payout !== null) {
        status = 'paid';
        label = payout.simulated ? 'Paid (simulated)' : 'Paid';
        paid += c.amountCents;
      } else if (c.state === 'rejected') {
        status = 'rejected';
        label = 'Not approved';
      } else if (c.state === 'raised') {
        status = 'pending';
        label = 'Awaiting the treasurer';
        owed += c.amountCents;
      } else if (c.batchId !== null) {
        status = 'batched';
        label = 'In a payment run';
        owed += c.amountCents;
      } else {
        status = 'approved';
        label = 'Approved';
        owed += c.amountCents;
      }
      return {
        id: c.id,
        match: `vs ${c.opponent}`,
        playedOn: c.playedOn,
        amount: formatMoney(c.amountCents),
        status,
        label,
        reference: payout?.reference ?? null,
      };
    });
  return { lines, owed: formatMoney(owed), paid: formatMoney(paid) };
}
