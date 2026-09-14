import assert from 'node:assert/strict';
import { test } from 'node:test';

import { financeReport, officiatingReport, proportion, registrationReport } from './summary.ts';
import type { FinanceFigures, OfficiatingFigures, RegistrationFigures } from './types.ts';

test('proportion — BR143, a figure carries its base', async (t) => {
  await t.test('reports the count, the base and the percent together', () => {
    const p = proportion(47, 312);
    assert.equal(p.percent, 15);
    // A screen could render 47 and drop "of 312". It cannot get that from
    // here: there is no function returning one without the other.
    assert.equal(p.label, '47 of 312 (15%)');
  });

  await t.test('says "none yet" rather than 0% for an empty base', () => {
    // "0% complete" for a season with no registrations reads as a failure.
    const p = proportion(0, 0);
    assert.equal(p.percent, null);
    assert.equal(p.label, 'none yet');
  });

  await t.test('rounds to whole percent', () => {
    assert.equal(proportion(1, 3).percent, 33);
    assert.equal(proportion(2, 3).percent, 67);
  });
});

test('registrationReport', async (t) => {
  const figures = (over: Partial<RegistrationFigures> = {}): RegistrationFigures => ({
    total: 100, complete: 60, pendingDocuments: 20, pendingPayment: 15,
    pendingExternal: 4, draft: 1, blockedBy: {}, ...over,
  });

  await t.test('reports complete and outstanding against the same base', () => {
    const r = registrationReport(figures());
    assert.equal(r.complete.label, '60 of 100 (60%)');
    assert.equal(r.outstanding.count, 40);
    assert.equal(r.outstanding.of, 100);
  });

  await t.test('orders blockers most common first', () => {
    // A registrar's afternoon belongs to the rule blocking forty families,
    // not the one blocking two.
    const r = registrationReport(figures({ blockedBy: { BR2: 5, BR3: 40, BR55: 2 } }));
    assert.deepEqual(r.blockers.map((b) => b.ruleId), ['BR3', 'BR2', 'BR55']);
  });

  await t.test('breaks a tie by rule id, so the list is stable between loads', () => {
    const r = registrationReport(figures({ blockedBy: { BR55: 3, BR2: 3 } }));
    assert.deepEqual(r.blockers.map((b) => b.ruleId), ['BR2', 'BR55']);
  });
});

test('financeReport', async (t) => {
  const figures = (over: Partial<FinanceFigures> = {}): FinanceFigures => ({
    registrations: 100, owing: 30, outstandingCents: 80000, creditCents: 20000,
    onAPlan: 12, instalmentsOverdue: 5, overdueCents: 15000,
    vouchersAttached: 4, vouchersVerified: 9, voucherReliefCents: 135000, ...over,
  });

  await t.test('reports owing and credit apart, never netted', () => {
    // A club owed $800 that owes $200 back is not a club owed $600, and
    // netting hides both numbers a treasurer needs.
    const r = financeReport(figures());
    assert.equal(r.outstandingCents, 80000);
    assert.equal(r.creditCents, 20000);
  });

  await t.test('measures plan take-up against those who owe, not everyone', () => {
    const r = financeReport(figures());
    assert.equal(r.onAPlan.of, 30);
  });

  await t.test('surfaces attached vouchers as work, not as relief (BR81)', () => {
    // An attached voucher has moved no money; counting it as relief would
    // overstate what the club has collected.
    const r = financeReport(figures());
    assert.equal(r.vouchersAwaitingVerification, 4);
    assert.equal(r.voucherReliefCents, 135000);
  });

  await t.test('reports the overdue share of what is outstanding', () => {
    assert.equal(financeReport(figures()).overdueShare.label, '15000 of 80000 (19%)');
  });

  await t.test('says "none yet" for a club that is owed nothing', () => {
    const r = financeReport(figures({ owing: 0, outstandingCents: 0, overdueCents: 0 }));
    assert.equal(r.overdueShare.percent, null);
  });
});

test('officiatingReport', async (t) => {
  const figures = (over: Partial<OfficiatingFigures> = {}): OfficiatingFigures => ({
    officials: 12, appointments: 50, accepted: 40, proposed: 6, declined: 3, withdrawn: 1,
    claimsRaised: 7, claimsApproved: 30, approvedCents: 135000, unverifiedFixtures: 9, ...over,
  });

  await t.test('reports acceptance and decline against the same base', () => {
    const r = officiatingReport(figures());
    assert.equal(r.accepted.of, 50);
    assert.equal(r.declined.of, 50);
  });

  await t.test('counts unverified appointments as work, because BR13 blocks on them', () => {
    assert.equal(officiatingReport(figures()).verificationsOutstanding, 9);
  });

  await t.test('separates a proposal awaiting an answer from a decline', () => {
    const r = officiatingReport(figures());
    assert.equal(r.awaitingResponse, 6);
    assert.equal(r.declined.count, 3);
  });
});
