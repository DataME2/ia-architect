import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { maskNomination, parseNomination } from './payout-nomination.ts';

describe('parseNomination', () => {
  it('accepts a bank account, tolerating spaces and dashes', () => {
    const r = parseNomination({ method: 'bank_transfer', accountName: ' A Ref ', bsb: '064-000', accountNumber: '1234 5678' });
    assert.deepEqual(r, { ok: true, value: { method: 'bank_transfer', accountName: 'A Ref', bsb: '064000', accountNumber: '12345678' } });
  });

  it('says what is wrong with a bank account', () => {
    assert.deepEqual(parseNomination({ method: 'bank_transfer', accountName: 'A', bsb: '06400', accountNumber: '12345' }),
      { ok: false, error: 'A BSB is six digits.' });
    assert.equal(parseNomination({ method: 'bank_transfer', accountName: '', bsb: '064000', accountNumber: '12345' }).ok, false);
  });

  it('accepts PayPal and Stripe, and refuses a bad one', () => {
    assert.equal(parseNomination({ method: 'paypal', paypalEmail: 'ref@example.com' }).ok, true);
    assert.equal(parseNomination({ method: 'paypal', paypalEmail: 'nope' }).ok, false);
    assert.equal(parseNomination({ method: 'stripe', stripeAccountId: 'acct_1Abc' }).ok, true);
    assert.equal(parseNomination({ method: 'stripe', stripeAccountId: 'cus_1Abc' }).ok, false);
  });

  it('refuses no method', () => {
    assert.deepEqual(parseNomination({}), { ok: false, error: 'Choose how to be paid.' });
  });
});

describe('maskNomination', () => {
  it('never shows a whole number or address', () => {
    assert.equal(maskNomination({ method: 'bank_transfer', bsb: '064000', account_number: '12345678' }),
      'Bank account · BSB ***-000 · ****5678');
    assert.equal(maskNomination({ method: 'paypal', paypal_email: 'referee@example.com' }), 'PayPal · r***@example.com');
    assert.equal(maskNomination({ method: 'stripe', stripe_account_id: 'acct_1Test72' }), 'Stripe · acct_…st72');
  });
});
