import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  awaitingVerification,
  canVerify,
  reliefCents,
  voucherSummary,
  type Voucher,
  type VoucherState,
} from './voucher.ts';

function voucher(overrides: Partial<Voucher> = {}): Voucher {
  return {
    id: 'v-1',
    registrationId: 'r-1',
    program: 'Play On!',
    code: 'PO-12345',
    faceValueCents: 20000,
    state: 'ATTACHED',
    filePath: 'club/reg/file.pdf',
    attachedAt: '2026-02-20T00:00:00Z',
    verifiedAt: null,
    rejectionReason: null,
    reliefPaymentId: null,
    ...overrides,
  };
}

describe('BR81 — attaching a voucher changes nothing', () => {
  test('an attached voucher relieves nothing', () => {
    assert.equal(reliefCents([voucher()]), 0);
  });

  test('only a verified or claimed voucher relieves anything', () => {
    const relieving: readonly VoucherState[] = ['VERIFIED', 'CLAIMED'];
    for (const state of relieving) {
      assert.equal(reliefCents([voucher({ state })]), 20000, state);
    }
    for (const state of ['ATTACHED', 'REJECTED'] as const) {
      assert.equal(reliefCents([voucher({ state })]), 0, state);
    }
  });

  test('relief sums across several verified vouchers', () => {
    assert.equal(
      reliefCents([
        voucher({ id: 'a', state: 'VERIFIED' }),
        voucher({ id: 'b', state: 'VERIFIED', faceValueCents: 5000 }),
        voucher({ id: 'c', state: 'ATTACHED', faceValueCents: 9900 }),
      ]),
      25000,
    );
  });

  test('the summary says the player stays pending, and names the rule', () => {
    const summary = voucherSummary([voucher()]);
    assert.ok(summary !== null);
    assert.match(summary, /\$200\.00/);
    assert.match(summary, /not yet verified/);
    assert.match(summary, /stays pending/);
    assert.match(summary, /BR81/);
  });

  test('an unverified voucher dominates the summary even beside a verified one', () => {
    // The unchecked one is the actionable fact; the verified one is history.
    const summary = voucherSummary([
      voucher({ id: 'a', state: 'VERIFIED' }),
      voucher({ id: 'b', state: 'ATTACHED', faceValueCents: 5000 }),
    ]);
    assert.ok(summary !== null);
    assert.match(summary, /not yet verified/);
    assert.match(summary, /\$50\.00/);
  });

  test('once everything is verified the summary reports the relief applied', () => {
    const summary = voucherSummary([voucher({ state: 'VERIFIED' })]);
    assert.ok(summary !== null);
    assert.match(summary, /\$200\.00 of verified voucher relief applied/);
  });

  test('all-rejected says so rather than reporting zero relief', () => {
    assert.equal(
      voucherSummary([voucher({ state: 'REJECTED', rejectionReason: 'Already spent.' })]),
      'Every voucher attached to this registration was rejected.',
    );
  });

  test('no vouchers at all is null, not a sentence about nothing', () => {
    assert.equal(voucherSummary([]), null);
  });
});

describe("the registrar's desk", () => {
  test('lists only what nobody has looked at', () => {
    const waiting = awaitingVerification([
      voucher({ id: 'a', state: 'ATTACHED' }),
      voucher({ id: 'b', state: 'VERIFIED' }),
      voucher({ id: 'c', state: 'REJECTED' }),
      voucher({ id: 'd', state: 'ATTACHED' }),
    ]);
    assert.deepEqual(
      waiting.map((v) => v.id),
      ['a', 'd'],
    );
  });
});

describe('verifying', () => {
  test('an attached voucher may be verified', () => {
    assert.equal(canVerify(voucher()).ok, true);
  });

  test('verifying twice is refused — it would apply the relief twice', () => {
    for (const state of ['VERIFIED', 'CLAIMED'] as const) {
      const result = canVerify(voucher({ state, reliefPaymentId: 'p-1' }));
      assert.equal(result.ok, false, state);
    }
  });

  test('a rejected voucher may be verified again — people change their minds', () => {
    assert.equal(canVerify(voucher({ state: 'REJECTED' })).ok, true);
  });

  test('a worthless voucher is refused', () => {
    assert.equal(canVerify(voucher({ faceValueCents: 0 })).ok, false);
  });
});
