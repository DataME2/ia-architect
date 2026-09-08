/**
 * The governance year, and whether the club still has one.
 *
 * A club's committee is elected at an Annual General Meeting and serves
 * until the next — about a year, but **the date that matters is the
 * meeting, not the anniversary**. A club that holds its AGM three months
 * late has a committee whose authority is a real question, and computing
 * the end date as "start plus one year" would answer that question wrongly
 * and silently.
 *
 * This matters beyond tidiness because other rules rest on Committee
 * authority: BR21 says a Voucher Program cannot be applied to a club's
 * invoices until the Committee approves it. If nobody can say which
 * committee that was, the approval is a claim rather than a record.
 */
import { ageAt, type IsoDate, type Person } from '../types.ts';

export const COMMITTEE_POSITIONS = [
  'president',
  'vice-president',
  'secretary',
  'treasurer',
  'registrar',
  'committee-member',
  'subcommittee-member',
] as const;
export type CommitteePosition = (typeof COMMITTEE_POSITIONS)[number];

export interface CommitteeTerm {
  readonly id: string;
  readonly name: string;
  /** Null while a term is being prepared before the meeting happens. */
  readonly agmHeldOn: IsoDate | null;
  readonly startsOn: IsoDate;
  readonly nextAgmDueOn: IsoDate;
}

export interface CommitteeMember {
  readonly id: string;
  readonly termId: string;
  readonly personId: string;
  readonly position: CommitteePosition;
  readonly electedOn: IsoDate | null;
  readonly resignedOn: IsoDate | null;
}

/**
 * `overdue` is the one worth having.
 *
 * It does not mean the committee has stopped governing — in practice they
 * carry on, and that is usually right. It means nobody has renewed their
 * mandate, and any approval recorded from here on rests on a term that
 * expired.
 */
export type TermStatus = 'not-yet-started' | 'current' | 'due-soon' | 'overdue';

/** Inside 60 days of the AGM falling due, so a club can call the meeting. */
export const AGM_WARNING_DAYS = 60;

function utcDay(date: IsoDate): number {
  // Date.UTC takes a 0-indexed month. Passing the calendar month straight
  // through shifts both dates forward by one, which cancels out for most
  // differences and quietly does not across months of unequal length.
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((utcDay(to) - utcDay(from)) / 86_400_000);
}

export function termStatus(term: CommitteeTerm, asAt: IsoDate): TermStatus {
  if (asAt < term.startsOn) return 'not-yet-started';
  if (asAt > term.nextAgmDueOn) return 'overdue';
  return daysBetween(asAt, term.nextAgmDueOn) <= AGM_WARNING_DAYS ? 'due-soon' : 'current';
}

/** Days until the AGM falls due — negative once it has passed. */
export function daysUntilAgm(term: CommitteeTerm, asAt: IsoDate): number {
  return daysBetween(asAt, term.nextAgmDueOn);
}

/**
 * The term governing at a date, or `null`.
 *
 * An overdue term still counts as governing: the club has not stopped
 * having a committee, it has stopped having a *renewed* one, and pretending
 * there is nobody in charge would be a worse description of reality than
 * saying the mandate has lapsed.
 */
export function governingTerm(
  terms: readonly CommitteeTerm[],
  asAt: IsoDate,
): CommitteeTerm | null {
  const started = terms.filter((t) => t.startsOn <= asAt);
  if (started.length === 0) return null;
  return started.reduce((latest, t) => (t.startsOn > latest.startsOn ? t : latest));
}

/** Members still serving — resignation is an early exit, not the term ending. */
export function serving(
  members: readonly CommitteeMember[],
  asAt: IsoDate,
): readonly CommitteeMember[] {
  return members.filter((m) => m.resignedOn === null || m.resignedOn > asAt);
}

/**
 * Office-bearer positions a club constitution normally requires.
 *
 * Reported as *missing* rather than refused: a club mid-way through filling
 * its committee should not be blocked from recording the people it has, and
 * a platform that refuses an incomplete committee is a platform the club
 * keeps its real committee list outside of.
 */
export const REQUIRED_OFFICES: readonly CommitteePosition[] = [
  'president',
  'secretary',
  'treasurer',
];

export function vacantOffices(
  members: readonly CommitteeMember[],
  asAt: IsoDate,
): readonly CommitteePosition[] {
  const held = new Set(serving(members, asAt).map((m) => m.position));
  return REQUIRED_OFFICES.filter((office) => !held.has(office));
}

/**
 * BR87 — a committee position may only be held by an adult.
 *
 * A MiniRoos player cannot govern the club. Their parent can, and so can a
 * life member, which is the point: this excludes people by *age*, never by
 * whether they play or how long they have been around.
 *
 * Measured at the term's start rather than today, because a committee
 * elected in March is a committee of the people who were adults in March.
 */
export function mayHoldCommitteePosition(person: Person, termStartsOn: IsoDate): boolean {
  return ageAt(person.dateOfBirth, termStartsOn) >= 18;
}

/**
 * BR88 — the roles the club should hold a Working with Children Check for.
 *
 * A MiniRoos player is not one of them, which is why they do not appear on
 * the screen that records a card. Children are exempt (BR84) and offering
 * one to a nine-year-old invites a registrar to record something that
 * cannot exist.
 */
export const CLEARANCE_EXPECTED_OF = [
  'committee member',
  'subcommittee member',
  'coach',
  'assistant coach',
  'manager',
  'team official',
  'match official',
] as const;
