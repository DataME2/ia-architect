/**
 * What a club owes an official for a game.
 *
 * Pure, like the registration rules engine, because this is arithmetic
 * about money and it has to be diffable against BR41 rather than trusted.
 *
 * **The platform seeds no rates.** Open question #1 was resolved by
 * dissolving it: there is no single rate table, each club's Committee sets
 * its own. So everything here resolves against rows a club authored, and a
 * club that has authored nothing gets `null` rather than a plausible zero.
 */

export type AppointedBy = 'club' | 'association';
export type OfficialRole = 'referee' | 'assistant_referee' | 'fourth_official';

/** One cell of a club's rate table. Null in a dimension means *any*. */
export interface FeeRate {
  readonly role: OfficialRole;
  readonly competition: string | null;
  readonly classification: string | null;
  readonly appointedBy: AppointedBy | null;
  readonly amountCents: number;
}

/** What is known about the appointment being priced. */
export interface Priceable {
  readonly role: OfficialRole;
  readonly competition: string | null;
  readonly classification: string | null;
  readonly appointedBy: AppointedBy;
}

export type RateOutcome =
  | { readonly kind: 'rate'; readonly amountCents: number; readonly matched: FeeRate }
  | { readonly kind: 'none' }
  | { readonly kind: 'ambiguous'; readonly candidates: readonly FeeRate[] };

/**
 * Whether a rate row can apply to this appointment at all.
 *
 * The role must match exactly — a rate is always *for* something. The other
 * three match when the row names the same value, or when the row says
 * nothing and therefore means any.
 *
 * Competition is compared case-insensitively and trimmed, because
 * `fixture.competition` is free text until C11 exists and a club typing
 * "Div 3" once and "div 3 " the next week has not described two
 * competitions. This is a limitation being managed, not a feature.
 */
function applies(rate: FeeRate, to: Priceable): boolean {
  if (rate.role !== to.role) return false;
  if (rate.competition !== null && !sameText(rate.competition, to.competition)) return false;
  if (rate.classification !== null && !sameText(rate.classification, to.classification)) {
    return false;
  }
  if (rate.appointedBy !== null && rate.appointedBy !== to.appointedBy) return false;
  return true;
}

function sameText(a: string, b: string | null): boolean {
  return b !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * How specific a matching row is.
 *
 * **Fixed precedence, not a count.** Counting named dimensions makes a row
 * naming the competition tie with one naming the classification, and a tie
 * has to be broken by something — insertion order, or a uuid. Either would
 * mean a club's rate depended on which row it happened to write first.
 *
 * The order is the one a club describes its own table in: *this
 * competition* beats *this classification* beats *appointed by this party*.
 */
function specificity(rate: FeeRate): number {
  return (
    (rate.competition !== null ? 4 : 0) +
    (rate.classification !== null ? 2 : 0) +
    (rate.appointedBy !== null ? 1 : 0)
  );
}

/**
 * The rate for one appointment.
 *
 * Three outcomes, and the second two are deliberately not zero.
 *
 * **`none` is an answer.** A club that has not priced this combination owes
 * a decision, not nothing — and a claim raised at $0.00 is one nobody
 * queries until the referee does.
 *
 * **`ambiguous` should be impossible** and is returned rather than resolved.
 * The database's `unique nulls not distinct` refuses two rows for one cell,
 * so reaching this means the constraint was dropped or the rows came from
 * somewhere else. Picking one arbitrarily would hide that; a treasurer
 * would find out when two identical games paid different amounts.
 */
export function rateFor(rates: readonly FeeRate[], to: Priceable): RateOutcome {
  const matching = rates.filter((r) => applies(r, to));
  if (matching.length === 0) return { kind: 'none' };

  const best = Math.max(...matching.map(specificity));
  const winners = matching.filter((r) => specificity(r) === best);

  if (winners.length > 1) return { kind: 'ambiguous', candidates: winners };
  return { kind: 'rate', amountCents: winners[0]!.amountCents, matched: winners[0]! };
}

/**
 * Whether a verified appointment can be claimed for, and why not.
 *
 * BR13, BR17 and BR18 in one place, because a treasurer asking "why is
 * there no claim for this game" should get one answer rather than three
 * screens' worth of inference.
 */
export interface ClaimableInput {
  readonly fixtureStatus: 'scheduled' | 'played' | 'cancelled' | 'abandoned' | 'forfeited';
  readonly verified: boolean;
  readonly officiated: boolean;
  readonly abandonmentNote: string | null;
  readonly alreadyClaimed: boolean;
}

export type Claimable =
  | { readonly kind: 'yes' }
  | { readonly kind: 'no'; readonly rule: string; readonly because: string };

export function claimable(input: ClaimableInput): Claimable {
  // BR14 first: it is the one whose failure costs money twice.
  if (input.alreadyClaimed) {
    return { kind: 'no', rule: 'BR14', because: 'This appointment has already been claimed for.' };
  }

  // BR17. No service was delivered, so nothing is owed — and this is
  // checked before verification, because a cancelled match is not a match
  // somebody failed to verify.
  if (input.fixtureStatus === 'cancelled') {
    return { kind: 'no', rule: 'BR17', because: 'The fixture was cancelled.' };
  }

  if (!input.verified) {
    return { kind: 'no', rule: 'BR13', because: 'The match has not been verified yet.' };
  }

  if (!input.officiated) {
    return {
      kind: 'no',
      rule: 'BR13',
      because: 'The verification records that they did not officiate.',
    };
  }

  // BR18. The explanation is required *before approval*, and asking for it
  // at claim time is what makes it available when the treasurer looks —
  // rather than a fortnight later, from memory.
  if (input.fixtureStatus === 'abandoned' && (input.abandonmentNote ?? '').trim() === '') {
    return {
      kind: 'no',
      rule: 'BR18',
      because: 'The match was abandoned and the official has not explained why.',
    };
  }

  return { kind: 'yes' };
}

/** Cents to the string a treasurer reconciles against a bank statement. */
export function money(cents: number): string {
  return (cents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
}
