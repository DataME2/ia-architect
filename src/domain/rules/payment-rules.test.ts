import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { context, payment, paymentPlan, registration } from '../test-fixtures.ts';
import { br3OutstandingPayment } from './br3-outstanding-payment.ts';
import { statusFromValidation } from './registration-status.ts';
import { fail, pass, type RuleOutcome } from './types.ts';

const plan = paymentPlan(); // $120.00 over four monthly instalments from 1 March

function evaluate(overrides: Parameters<typeof context>[0]) {
  return br3OutstandingPayment.evaluate(context(overrides));
}

describe('BR3 without a payment plan — the original rule, unchanged', () => {
  test('nothing outstanding passes', () => {
    const outcome = evaluate({ registration: registration({ outstandingAmountCents: 0 }) });
    assert.equal(outcome.status, 'pass');
  });

  test('an outstanding balance fails, and names the amount', () => {
    const outcome = evaluate({ registration: registration({ outstandingAmountCents: 12050 }) });
    assert.equal(outcome.status, 'fail');
    assert.match(outcome.message, /\$120\.50/);
  });

  test('a credit is not an obstacle — the club owes them, not the other way round', () => {
    const outcome = evaluate({ registration: registration({ outstandingAmountCents: -2500 }) });
    assert.equal(outcome.status, 'pass');
  });
});

describe('BR3 with a payment plan — no pay, no play is absolute (BR79)', () => {
  test('a family up to date on a plan still fails, because they still owe', () => {
    // The club's policy is absolute: a plan schedules the debt, it does not
    // buy the child a game. Being current is not being paid.
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: 9000 }),
      paymentPlan: plan,
      payments: [payment({ amountCents: 3000 })],
      asAt: '2026-03-15',
    });
    assert.equal(outcome.status, 'fail');
    assert.match(outcome.message, /\$90\.00 outstanding on a payment plan/);
    assert.match(outcome.message, /up to date/, 'but it says they are current');
  });

  test('and the message names the next instalment, so the club knows what to expect', () => {
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: 9000 }),
      paymentPlan: plan,
      payments: [payment({ amountCents: 3000 })],
      asAt: '2026-03-15',
    });
    assert.match(outcome.message, /2026-04-01/);
  });

  test('a missed instalment says so as well as the balance', () => {
    // "$120 outstanding" and "$120 outstanding and you missed 1 March" send a
    // registrar to two different places; only the second is a call today.
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: 12000 }),
      paymentPlan: plan,
      payments: [],
      asAt: '2026-03-15',
    });
    assert.equal(outcome.status, 'fail');
    assert.match(outcome.message, /\$120\.00 outstanding/);
    assert.match(outcome.message, /\$30\.00 of the payment plan is overdue/);
  });

  test('a plan paid in full passes', () => {
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: 0 }),
      paymentPlan: plan,
      payments: [payment({ amountCents: 12000 })],
      asAt: '2026-07-01',
    });
    assert.equal(outcome.status, 'pass');
  });

  test('a cancelled plan gives the plain balance message', () => {
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: 9000 }),
      paymentPlan: paymentPlan({ cancelledAt: '2026-04-01T00:00:00Z' }),
      payments: [payment({ amountCents: 3000 })],
      asAt: '2026-04-15',
    });
    assert.equal(outcome.status, 'fail');
    assert.match(outcome.message, /\$90\.00 is still outstanding/);
  });

  test('a credit passes and is reported as a credit', () => {
    const outcome = evaluate({
      registration: registration({ outstandingAmountCents: -2500 }),
      paymentPlan: plan,
      payments: [payment({ amountCents: 14500 })],
      asAt: '2026-07-01',
    });
    assert.equal(outcome.status, 'pass');
    assert.match(outcome.message, /credit of \$25\.00/);
  });
});

describe('deriving the registration status', () => {
  const clean: readonly RuleOutcome[] = [pass('BR2', 'ok'), pass('BR3', 'ok')];

  test('missing documents park it at PENDING_DOCUMENTS', () => {
    const outcomes = [fail('BR2', 'Still needed: Birth certificate.'), pass('BR3', 'ok')];
    assert.equal(statusFromValidation('DRAFT', outcomes), 'PENDING_DOCUMENTS');
  });

  test('arrears park it at PENDING_PAYMENT', () => {
    const outcomes = [pass('BR2', 'ok'), fail('BR3', 'overdue')];
    assert.equal(statusFromValidation('DRAFT', outcomes), 'PENDING_PAYMENT');
  });

  test('documents outrank payment — a family is not chased for money first', () => {
    const outcomes = [fail('BR2', 'missing'), fail('BR3', 'overdue')];
    assert.equal(statusFromValidation('PENDING_PAYMENT', outcomes), 'PENDING_DOCUMENTS');
  });

  test('clearing the blockers returns it to DRAFT, not COMPLETE', () => {
    // COMPLETE is the federation's word, never the club's own sweep (BR60).
    assert.equal(statusFromValidation('PENDING_DOCUMENTS', clean), 'DRAFT');
  });

  test('a rule that is neither documents nor money leaves it in DRAFT', () => {
    const outcomes = [fail('BR1', 'A guardian is required.'), pass('BR2', 'ok'), pass('BR3', 'ok')];
    assert.equal(statusFromValidation('DRAFT', outcomes), 'DRAFT');
  });

  test('a submitted registration is never dragged back by a rule sweep', () => {
    const outcomes = [fail('BR2', 'missing'), fail('BR3', 'overdue')];
    assert.equal(
      statusFromValidation('PENDING_EXTERNAL_REGISTRATION', outcomes),
      'PENDING_EXTERNAL_REGISTRATION',
    );
  });

  test('and a COMPLETE registration stays COMPLETE', () => {
    const outcomes = [fail('BR3', 'overdue')];
    assert.equal(statusFromValidation('COMPLETE', outcomes), 'COMPLETE');
  });

  test('a clean sweep never produces COMPLETE or PENDING_EXTERNAL_REGISTRATION', () => {
    for (const start of ['DRAFT', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT'] as const) {
      const next = statusFromValidation(start, clean);
      assert.notEqual(next, 'COMPLETE');
      assert.notEqual(next, 'PENDING_EXTERNAL_REGISTRATION');
    }
  });
});
