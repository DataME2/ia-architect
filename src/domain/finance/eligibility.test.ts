import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { blockedByMoney, playEligibility, totalOwed } from './eligibility.ts';

describe('BR79 — no pay, no play', () => {
  test('registered and paid up may play', () => {
    const result = playEligibility('COMPLETE', 0);
    assert.equal(result.mayPlay, true);
    assert.equal(result.blockedBy, null);
  });

  test('registered but owing may NOT play, however small the debt', () => {
    for (const cents of [1, 500, 12050]) {
      const result = playEligibility('COMPLETE', cents);
      assert.equal(result.mayPlay, false, `${cents} cents should block`);
      assert.equal(result.blockedBy, 'owes-money');
    }
  });

  test('the message names the amount, so a treasurer can act on it', () => {
    assert.match(playEligibility('COMPLETE', 8032).reason, /\$80\.32/);
    assert.match(playEligibility('COMPLETE', 8032).reason, /BR79/);
  });

  test('a credit is not a debt — the club owes them', () => {
    const result = playEligibility('COMPLETE', -2500);
    assert.equal(result.mayPlay, true);
  });

  test('not yet confirmed by the federation blocks, whatever the balance', () => {
    for (const status of ['DRAFT', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT', 'PENDING_EXTERNAL_REGISTRATION'] as const) {
      assert.equal(playEligibility(status, 0).mayPlay, false, status);
      assert.equal(playEligibility(status, 0).blockedBy, 'not-registered');
    }
  });

  test('when both gates fail, registration is reported first', () => {
    // It is the one the club cannot fix by taking a payment over the phone.
    const result = playEligibility('PENDING_PAYMENT', 5000);
    assert.equal(result.blockedBy, 'not-registered');
    assert.match(result.reason, /\$50\.00/, 'but the money is still mentioned');
  });

  test('a submitted-but-unconfirmed player cannot play even paid in full', () => {
    // BR43/BR60: sending is the club's act, registering is the federation's.
    assert.equal(playEligibility('PENDING_EXTERNAL_REGISTRATION', 0).mayPlay, false);
  });
});

describe('the pile that looks finished and is not', () => {
  const entries = [
    { status: 'COMPLETE' as const, outstandingCents: 0 },
    { status: 'COMPLETE' as const, outstandingCents: 8032 },
    { status: 'COMPLETE' as const, outstandingCents: 1500 },
    { status: 'PENDING_PAYMENT' as const, outstandingCents: 4000 },
    { status: 'COMPLETE' as const, outstandingCents: -500 },
  ];

  test('catches the confirmed player who was charged later', () => {
    // The case BR3 structurally cannot reach: the status is frozen at
    // COMPLETE, so only a fresh eligibility question finds them.
    const blocked = blockedByMoney(entries);
    assert.equal(blocked.length, 2);
    assert.deepEqual(
      blocked.map((e) => e.outstandingCents).sort((a, b) => a - b),
      [1500, 8032],
    );
  });

  test('does not include a registration still working through the queue', () => {
    // Already visible as work in progress; this pile is the deceptive one.
    const blocked = blockedByMoney(entries);
    assert.ok(!blocked.some((e) => e.status === 'PENDING_PAYMENT'));
  });

  test('totals what the club is owed, ignoring credits', () => {
    assert.equal(totalOwed(entries), 8032 + 1500 + 4000);
  });

  test('an empty season owes nothing and blocks nobody', () => {
    assert.equal(totalOwed([]), 0);
    assert.deepEqual(blockedByMoney([]), []);
  });
});
