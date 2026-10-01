/**
 * Where an official is paid (scope 76, BR161): the form's parsing and the
 * masked line every screen shows. The database checks the same shapes
 * (0072); this says what is wrong before the round trip, in words.
 */

export type PayoutMethod = 'bank_transfer' | 'paypal' | 'stripe';

export const PAYOUT_METHOD_LABEL: Readonly<Record<PayoutMethod, string>> = {
  bank_transfer: 'Bank account',
  paypal: 'PayPal',
  stripe: 'Stripe',
};

export type NominationInput =
  | { readonly method: 'bank_transfer'; readonly accountName: string; readonly bsb: string; readonly accountNumber: string }
  | { readonly method: 'paypal'; readonly paypalEmail: string }
  | { readonly method: 'stripe'; readonly stripeAccountId: string };

const digits = (v: unknown) => String(v ?? '').replace(/[\s-]/g, '');

export function parseNomination(
  form: Readonly<Record<string, unknown>>,
): { readonly ok: true; readonly value: NominationInput } | { readonly ok: false; readonly error: string } {
  const method = String(form.method ?? '');
  if (method === 'bank_transfer') {
    const accountName = String(form.accountName ?? '').trim();
    const bsb = digits(form.bsb);
    const accountNumber = digits(form.accountNumber);
    if (accountName === '') return { ok: false, error: 'Enter the name on the account.' };
    if (!/^\d{6}$/.test(bsb)) return { ok: false, error: 'A BSB is six digits.' };
    if (!/^\d{5,10}$/.test(accountNumber)) return { ok: false, error: 'An account number is five to ten digits.' };
    return { ok: true, value: { method, accountName, bsb, accountNumber } };
  }
  if (method === 'paypal') {
    const paypalEmail = String(form.paypalEmail ?? '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(paypalEmail)) return { ok: false, error: 'Enter the PayPal email address.' };
    return { ok: true, value: { method, paypalEmail } };
  }
  if (method === 'stripe') {
    const stripeAccountId = String(form.stripeAccountId ?? '').trim();
    if (!/^acct_[A-Za-z0-9]+$/.test(stripeAccountId)) {
      return { ok: false, error: 'A Stripe account id starts with acct_.' };
    }
    return { ok: true, value: { method, stripeAccountId } };
  }
  return { ok: false, error: 'Choose how to be paid.' };
}

/** What a screen shows: never the whole number or address. */
export function maskNomination(n: {
  readonly method: PayoutMethod;
  readonly bsb?: string | null;
  readonly account_number?: string | null;
  readonly paypal_email?: string | null;
  readonly stripe_account_id?: string | null;
}): string {
  if (n.method === 'bank_transfer') {
    return `Bank account · BSB ***-${(n.bsb ?? '').slice(-3)} · ****${(n.account_number ?? '').slice(-4)}`;
  }
  if (n.method === 'paypal') {
    const [user = '', domain = ''] = (n.paypal_email ?? '').split('@');
    return `PayPal · ${user.slice(0, 1)}***@${domain}`;
  }
  return `Stripe · ${(n.stripe_account_id ?? '').slice(0, 5)}…${(n.stripe_account_id ?? '').slice(-4)}`;
}
