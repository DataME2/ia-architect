/**
 * Reading the fee schedule's forms (scope 130, WP3): a fee line, the sibling
 * discount and the terms' placeholder values. The database refuses what
 * cannot be a price (0099's checks); this says why in a sentence first.
 */
import { parseAmountCents } from './money.ts';
import type { FeeKind } from './registration-price.ts';

export interface FeeLineInput {
  readonly kind: FeeKind;
  readonly name: string;
  readonly amountCents: number;
  readonly depositCents: number | null;
  readonly minAge: number | null;
  readonly maxAge: number | null;
  readonly adminOnly: boolean;
}

type Parsed<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

const KINDS: readonly FeeKind[] = ['club', 'governing', 'levy'];

function age(raw: string, label: string): Parsed<number | null> {
  const s = raw.trim();
  if (s === '') return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(s) || Number(s) > 120) return { ok: false, error: `${label} must be a whole number of years.` };
  return { ok: true, value: Number(s) };
}

export function parseFeeLine(fields: {
  readonly kind: string;
  readonly name: string;
  readonly amount: string;
  readonly deposit: string;
  readonly minAge: string;
  readonly maxAge: string;
  readonly adminOnly: boolean;
}): Parsed<FeeLineInput> {
  const kind = KINDS.find((k) => k === fields.kind);
  if (kind === undefined) return { ok: false, error: 'Choose what kind of fee this is.' };
  const name = fields.name.trim();
  if (name === '') return { ok: false, error: 'Name the fee as a family will read it.' };
  if (name.length > 200) return { ok: false, error: 'Keep the name under 200 characters.' };

  const amount = parseAmountCents(fields.amount);
  if (!amount.ok) return { ok: false, error: amount.error };
  if (amount.cents < 0) return { ok: false, error: 'A fee cannot be negative.' };

  let depositCents: number | null = null;
  if (fields.deposit.trim() !== '') {
    const deposit = parseAmountCents(fields.deposit);
    if (!deposit.ok) return { ok: false, error: `Deposit: ${deposit.error}` };
    if (deposit.cents < 0 || deposit.cents > amount.cents) {
      return { ok: false, error: 'A deposit is part of the fee, so it cannot be more than the fee.' };
    }
    depositCents = deposit.cents;
  }

  const minAge = age(fields.minAge, 'The youngest age');
  if (!minAge.ok) return minAge;
  const maxAge = age(fields.maxAge, 'The oldest age');
  if (!maxAge.ok) return maxAge;
  if (minAge.value !== null && maxAge.value !== null && minAge.value > maxAge.value) {
    return { ok: false, error: 'The youngest age is after the oldest.' };
  }

  return {
    ok: true,
    value: { kind, name, amountCents: amount.cents, depositCents, minAge: minAge.value, maxAge: maxAge.value, adminOnly: fields.adminOnly },
  };
}

/** "15" or "15%" → 1500 basis points. */
export function parseDiscount(raw: string): Parsed<number> {
  const s = raw.trim().replace(/%$/, '').trim();
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return { ok: false, error: 'Enter the discount as a percentage, like 15.' };
  const bps = Math.round(Number(s) * 100);
  if (bps > 10000) return { ok: false, error: 'A discount cannot be more than 100%.' };
  return { ok: true, value: bps };
}

/** The terms' placeholder values from `value:<name>` fields, blanks dropped. */
export function termsValues(entries: Iterable<readonly [string, string]>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    const m = /^value:([a-z_]+)$/.exec(key);
    if (m !== null && value.trim() !== '') out[m[1]!] = value.trim();
  }
  return out;
}

/**
 * A starting point for a club with no terms yet: the product owner's text of
 * 30 October 2026, with the pilot club's own addresses turned into
 * placeholders so it fits any club.
 */
export const STARTER_TERMS = `Academy players
By completing your registration you confirm you have read, understand and accept the Standards Agreement included in your Letter of Offer.

Fees
1. {club} has a NO PAY, NO PLAY policy.
2. {club} has a refund policy.
3. Payment plans are available. Apply at the checkout at the end of the club registration.
4. Fees are paid in full before the first fixture of the season, unless you are on a club-approved direct-debit payment plan. Club-approved direct-debit plans must be finalised by {date_in_future}.

Levies
1. {club} imposes a volunteer levy. More about it at {levies_link}.

Codes of Conduct
1. Players must follow the Players' Code of Conduct: {player_conduct_link}
2. All parents and guardians must follow the Parents' and Spectators' Code of Conduct: {check_website_link}
3. Failing to follow a Code of Conduct has consequences for the player's club registration, which may include exclusion from training and games, or other action the club decides.
4. Disrespectful behaviour on or off the field is not acceptable at {club}.
5. Do not approach or call out to the referees. This applies to players, spectators, coaches and managers. Raise any concern with the ground official, a club official, or by email to {club_email}.`;
