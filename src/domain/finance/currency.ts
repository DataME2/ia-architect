/**
 * BR200 — every amount carries its currency, and two currencies are never
 * combined.
 *
 * Until now every amount in this codebase has been an unlabelled count of
 * cents printed with a `$` (`formatMoney` in `./money.ts`), which is right
 * for an Australian club and silently wrong for a New Zealand one: nothing
 * errors, the figure just says the wrong thing. `Money` makes the currency
 * part of the value, and the arithmetic here **throws** rather than adding
 * AUD to NZD, because a total across currencies is a number that looks
 * right and is not.
 *
 * Rejected: converting at a rate. No rate is held, and BR200 says a
 * conversion must record its rate, source and date — so none happens here.
 *
 * First used by the public event calculator (BR222, scope 135); the
 * club-side ledger moves onto it in scope 134's WP1.
 */

export const CURRENCIES = ['AUD', 'NZD'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Money {
  /** Whole cents. Never a float: `0.1 + 0.2` is a treasurer's bad afternoon. */
  readonly cents: number;
  readonly currency: Currency;
}

/** `A$` and `NZ$`, not a bare `$`, so the two can never be mistaken for each other. */
const SYMBOL: Readonly<Record<Currency, string>> = { AUD: 'A$', NZD: 'NZ$' };

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function money(cents: number, currency: Currency): Money {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`An amount is a whole number of cents, not ${cents} (BR200).`);
  }
  return { cents, currency };
}

/** Adds two amounts of the same currency, and refuses two different ones. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new TypeError(`${a.currency} and ${b.currency} are never added together (BR200).`);
  }
  return money(a.cents + b.cents, a.currency);
}

/**
 * Formats an amount for a person: `A$1,234.50`, `-NZ$12.00`.
 *
 * Written out rather than left to `Intl.NumberFormat`, for the reason
 * `formatMoney` gives in `./money.ts`: the same figure must read the same in
 * the browser, on the server and in a test, and ICU builds disagree about
 * currency symbols.
 */
export function formatCurrency(m: Money): string {
  const sign = m.cents < 0 ? '-' : '';
  const abs = Math.abs(m.cents);
  const dollars = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${SYMBOL[m.currency]}${dollars}.${String(abs % 100).padStart(2, '0')}`;
}
