/**
 * What a registration costs (BR195, scope 130), decided once and tested:
 *
 * - the club's fee line for the player: their team's line, else the
 *   cheapest *standard* line for their age, else the cheapest that fits
 *   (`defaultLine`, as 0100's `registration_breakdown` chooses);
 * - plus the governing body's fee for that age, chosen the same way;
 * - plus each levy;
 * - less the club's sibling discount on the **club line only**, for every
 *   player after the first that the same parent or guardian registered in
 *   that season and club. Governing-body fees and levies are never
 *   discounted (the product owner's answer to open question 118).
 *
 * Amounts are whole cents, and a discount rounds to the nearest cent.
 */
export type FeeKind = 'club' | 'governing' | 'levy';

export interface FeeLine {
  readonly id: string;
  readonly kind: FeeKind;
  readonly name: string;
  readonly amountCents: number;
  /** Paid up front where the club asks for one; part of the amount, not on top. */
  readonly depositCents: number | null;
  /** Inclusive ages in the season; null is "no bound". */
  readonly minAge: number | null;
  readonly maxAge: number | null;
  /** Shown to the club only (*admin only* on the pilot club's schedule). */
  readonly adminOnly: boolean;
  /** Charged to a player with no team yet, for their age (0100). */
  readonly standard: boolean;
}

/**
 * A player's age for a fee: the age they turn in the season's year, as the
 * governing body counts age groups (an Under 9 turns eight).
 */
export function ageThisSeason(dateOfBirth: string, seasonStartsOn: string): number {
  return Number(seasonStartsOn.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
}

export interface PriceLine {
  readonly label: string;
  readonly cents: number;
}

export interface Price {
  readonly lines: readonly PriceLine[];
  readonly discountCents: number;
  readonly totalCents: number;
  readonly depositCents: number;
}

/** 15% by default, in basis points, as `fee_settings` stores it. */
export const DEFAULT_SIBLING_DISCOUNT_BPS = 1500;

export function fitsAge(line: FeeLine, age: number): boolean {
  return (line.minAge === null || age >= line.minAge) && (line.maxAge === null || age <= line.maxAge);
}

/** The lines of one kind a player of `age` may be registered under. */
export function linesFor(lines: readonly FeeLine[], kind: FeeKind, age: number): FeeLine[] {
  return lines.filter((l) => l.kind === kind && fitsAge(l, age));
}

/**
 * The line a player of `age` is charged without a team: the cheapest standard
 * line that fits, else the cheapest that fits, then by name. The same order
 * as 0100's `registration_breakdown`, so the calculator agrees with the
 * database.
 */
export function defaultLine(lines: readonly FeeLine[], kind: FeeKind, age: number): FeeLine | null {
  return (
    [...linesFor(lines, kind, age)].sort(
      (a, b) => Number(b.standard) - Number(a.standard) || a.amountCents - b.amountCents || a.name.localeCompare(b.name),
    )[0] ?? null
  );
}

/**
 * The player's place among their guardian's registrations this season: 0 for
 * the first, 1 for the second, and so on. Earlier means opened earlier.
 */
export function siblingPlace(openedAt: string, guardianOpenings: readonly string[]): number {
  return guardianOpenings.filter((t) => t < openedAt).length;
}

export function priceRegistration({
  clubLine,
  lines,
  age,
  siblingIndex,
  discountBps,
}: {
  /** The player's club line (their team's, or `defaultLine`), or null when the club has none. */
  readonly clubLine: FeeLine | null;
  readonly lines: readonly FeeLine[];
  readonly age: number;
  readonly siblingIndex: number;
  readonly discountBps: number;
}): Price {
  const out: PriceLine[] = [];
  if (clubLine !== null) out.push({ label: clubLine.name, cents: clubLine.amountCents });
  const governing = defaultLine(lines, 'governing', age);
  if (governing !== null) out.push({ label: governing.name, cents: governing.amountCents });
  for (const levy of linesFor(lines, 'levy', age)) out.push({ label: levy.name, cents: levy.amountCents });

  const discountCents =
    clubLine !== null && siblingIndex > 0 ? Math.round((clubLine.amountCents * Math.max(0, Math.min(10000, discountBps))) / 10000) : 0;
  const gross = out.reduce((s, l) => s + l.cents, 0);
  return {
    lines: out,
    discountCents,
    totalCents: gross - discountCents,
    depositCents: clubLine?.depositCents ?? 0,
  };
}

/** `{club}` and the like, filled from the club's own values; an unknown one stays as typed. */
export function fillTerms(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z_]+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** The placeholders a template uses, in order of first appearance. */
export function placeholdersIn(template: string): string[] {
  return [...new Set([...template.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]!))];
}
