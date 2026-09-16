/**
 * Chasing many families at once, decided purely.
 *
 * One-at-a-time has worked since the messaging slice landed: the
 * registration detail has a *Send reminder* panel, and a registrar chasing
 * forty families opens forty pages. This is the same act from the season
 * queue — and it is where the two ways a bulk send goes wrong live, because
 * neither of them can happen when a human is looking at one child at a time:
 *
 *   * **a reminder listing nothing**, which teaches a family that the
 *     club's messages are noise (the same reason the template refuses to
 *     compose an empty list), and
 *   * **the same family chased twice in a week**, which is a button pressed
 *     once more than intended and is indistinguishable, from the family's
 *     side, from a fault.
 *
 * So this decides *who is actually being chased*, and names everybody it
 * leaves out and why. A screen that sent to eighteen of twenty-one and said
 * "18 sent" would be hiding the three the registrar most needs to know
 * about.
 */

export interface RemindableEntry {
  readonly registrationId: string;
  readonly personId: string;
  readonly displayName: string;
  /** How many rules are failing — the reminder's whole content (BR127). */
  readonly outstanding: number;
  /** ISO date this person was last reminded, or null. */
  readonly lastRemindedOn: string | null;
}

export type SkipReason = 'nothing-outstanding' | 'reminded-recently';

export interface Skipped {
  readonly displayName: string;
  readonly reason: SkipReason;
  readonly detail: string;
}

export interface ReminderPlan {
  readonly toSend: readonly RemindableEntry[];
  readonly skipped: readonly Skipped[];
}

/**
 * How long a family is left alone after being reminded.
 *
 * Seven days rather than a configurable number. A club that needs to chase
 * the same family twice in a week has a conversation to have, not a message
 * to resend — and the single-registration panel is still there for the case
 * where a registrar genuinely means it, which is the escape hatch that
 * makes a fixed floor safe rather than obstructive.
 */
export const QUIET_DAYS = 7;

/**
 * Who a bulk send would actually reach, and who it would not.
 *
 * Ordered by name so the list reads the same way twice — a registrar
 * comparing "who is left" between two loads should not have to re-find
 * everybody.
 */
export function planReminders(
  entries: readonly RemindableEntry[],
  today: string,
  quietDays: number = QUIET_DAYS,
): ReminderPlan {
  const toSend: RemindableEntry[] = [];
  const skipped: Skipped[] = [];

  for (const entry of [...entries].sort((a, b) => a.displayName.localeCompare(b.displayName))) {
    if (entry.outstanding === 0) {
      skipped.push({
        displayName: entry.displayName,
        reason: 'nothing-outstanding',
        detail: 'Nothing is outstanding, so there is nothing to chase.',
      });
      continue;
    }

    const days = entry.lastRemindedOn === null ? null : daysBetween(entry.lastRemindedOn, today);
    if (days !== null && days < quietDays) {
      skipped.push({
        displayName: entry.displayName,
        reason: 'reminded-recently',
        detail: days === 0
          ? 'Reminded today already.'
          : `Reminded ${days} day${days === 1 ? '' : 's'} ago.`,
      });
      continue;
    }

    toSend.push(entry);
  }

  return { toSend, skipped };
}

/**
 * Whole days from one ISO date to another.
 *
 * Both are dates rather than instants, so this is calendar arithmetic and
 * not a duration: "reminded yesterday" must mean yesterday to a registrar
 * at nine in the morning as well as at five in the afternoon.
 */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(...parts(from));
  const b = Date.UTC(...parts(to));
  return Math.floor((b - a) / 86_400_000);
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [y ?? 1970, (m ?? 1) - 1, d ?? 1];
}

export interface SendTally {
  readonly families: number;
  readonly sent: number;
  readonly withheld: number;
}

/**
 * What to tell the registrar afterwards.
 *
 * Never one averaged verdict. A household where one guardian is reachable
 * and the other has unsubscribed is the ordinary case, and the registrar's
 * next move depends on which of the two it was — the same reason the
 * single-registration action returns one outcome per guardian.
 */
export function summarise(tally: SendTally, skipped: number): string {
  if (tally.families === 0) {
    // Everybody planReminders chose to chase was attempted and none of them
    // was reached — the opposite of "nobody needed chasing", and the one
    // case this function most needs to get right, because it is what a
    // total send failure (an unconfigured mail provider, a site URL that is
    // not set) looks like from here: a plan with something to send and a
    // tally with nothing delivered.
    if (tally.withheld > 0) {
      return `Nothing sent — ${tally.withheld} recipient${tally.withheld === 1 ? '' : 's'} `
        + 'could not be written to.'
        + (skipped === 0 ? '' : ` ${skipped} more skipped, listed below.`);
    }
    return skipped === 0
      ? 'Nobody needed chasing.'
      : `Nothing sent — all ${skipped} were skipped, for the reasons listed.`;
  }

  const head = `Reminded ${tally.families} ${tally.families === 1 ? 'family' : 'families'} `
    + `(${tally.sent} message${tally.sent === 1 ? '' : 's'}).`;

  const tail = [
    tally.withheld === 0
      ? null
      : `${tally.withheld} recipient${tally.withheld === 1 ? ' was' : 's were'} not written to — `
        + 'unsubscribed, or with no address recorded.',
    skipped === 0 ? null : `${skipped} skipped, listed below.`,
  ].filter((s): s is string => s !== null);

  return tail.length === 0 ? head : `${head} ${tail.join(' ')}`;
}
