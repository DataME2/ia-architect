/**
 * Money in and money out, for the screens.
 *
 * Cents everywhere, never a float: `0.1 + 0.2` is a rounding error a
 * treasurer eventually finds in a reconciliation, and money that is one cent
 * wrong is money that is wrong.
 */

export { formatMoney as formatCents } from '../domain/finance/money.ts';

export type AmountResult =
  | { readonly ok: true; readonly cents: number }
  | { readonly ok: false; readonly error: string };

/**
 * Parse what a registrar typed into an amount in cents.
 *
 * Accepts a leading `$`, thousands separators, and up to two decimals,
 * because those are the things a human types into a box labelled "amount".
 * Rejects three decimals rather than rounding them: someone who typed
 * `10.005` meant something, and guessing which is how a cent goes missing.
 *
 * Negative is allowed. A credit is a real state — BR3 treats it as no
 * obstacle, since blocking a child over money the club owes *them* would be
 * the wrong way round.
 */
export function parseAmountCents(input: string): AmountResult {
  const raw = input.trim().replace(/^\$/, '').replace(/,/g, '');
  if (raw === '') return { ok: false, error: 'Enter an amount.' };

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (match === null) {
    return { ok: false, error: 'Use dollars and cents, like 120 or 120.50.' };
  }

  const [, sign, dollars, decimals = ''] = match as unknown as [
    string,
    string,
    string,
    string | undefined,
  ];
  const cents = Number(dollars) * 100 + Number(decimals.padEnd(2, '0'));
  return { ok: true, cents: sign === '-' ? -cents : cents };
}
