import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { planState } from '../domain/finance/plan.ts';
import { payment, paymentPlan } from '../domain/test-fixtures.ts';
import { parseCadence, parseDueDate, parseMethod, parsePlanDraft, planSummary } from './plan-view.ts';

const SEASON_END = '2026-12-01';

describe('parsing a plan draft', () => {
  const valid = { total: '$120.00', count: '4', firstDueOn: '2026-03-01', cadence: 'monthly' };

  test('a valid draft previews the schedule it would create', () => {
    const result = parsePlanDraft(valid, SEASON_END);
    assert.ok(result.ok);
    assert.equal(result.preview.length, 4);
    assert.equal(
      result.preview.reduce((n, i) => n + i.amountCents, 0),
      12000,
    );
  });

  test('rejects a schedule that outlives the season (BR76)', () => {
    const result = parsePlanDraft({ ...valid, count: '12' }, '2026-06-01');
    assert.ok(!result.ok);
    assert.match(result.error, /BR76/);
  });

  test('rejects a date that looks like one but is not', () => {
    const result = parsePlanDraft({ ...valid, firstDueOn: '2026-02-31' }, SEASON_END);
    assert.ok(!result.ok);
    assert.match(result.error, /real calendar date/);
  });

  test('rejects a fractional or zero instalment count', () => {
    for (const count of ['0', '2.5', '-3', 'four', '']) {
      assert.ok(!parsePlanDraft({ ...valid, count }, SEASON_END).ok, count);
    }
  });

  test('rejects a total that will not parse, and one that is zero', () => {
    assert.ok(!parsePlanDraft({ ...valid, total: 'lots' }, SEASON_END).ok);
    assert.ok(!parsePlanDraft({ ...valid, total: '0' }, SEASON_END).ok);
  });

  test('rejects a cadence that did not come from the list', () => {
    assert.ok(!parsePlanDraft({ ...valid, cadence: 'daily' }, SEASON_END).ok);
    assert.ok(!parsePlanDraft({ ...valid, cadence: undefined }, SEASON_END).ok);
  });

  test('a real date that is 29 February in a leap year is accepted', () => {
    assert.equal(parseDueDate('2028-02-29'), '2028-02-29');
    assert.equal(parseDueDate('2026-02-29'), null);
  });

  test('narrows cadence and method, refusing anything else', () => {
    assert.equal(parseCadence('fortnightly'), 'fortnightly');
    assert.equal(parseCadence('annually'), null);
    assert.equal(parseMethod('bank-transfer'), 'bank-transfer');
    assert.equal(parseMethod('bitcoin'), null);
  });
});

describe('the plan summary', () => {
  const plan = paymentPlan(); // $120 over four monthly instalments from 1 March

  function summaryAt(payments: Parameters<typeof planState>[2], asAt: string): string {
    return planSummary(planState(plan.totalCents, plan.installments, payments, asAt));
  }

  test('leads with arrears, because that is what blocks the registration', () => {
    const summary = summaryAt([], '2026-03-15');
    assert.match(summary, /^\$30\.00 overdue/);
    assert.match(summary, /BR3/);
  });

  test('says up to date, and names the next instalment', () => {
    const summary = summaryAt([payment({ amountCents: 3000 })], '2026-03-15');
    assert.match(summary, /Up to date/);
    assert.match(summary, /\$90\.00 still to come/);
    assert.match(summary, /2026-04-01/);
  });

  test('reports a part-paid next instalment by what is left of it', () => {
    const summary = summaryAt([payment({ amountCents: 4000 })], '2026-03-15');
    assert.match(summary, /next instalment \$20\.00 on 2026-04-01/);
  });

  test('paid in full says so and stops', () => {
    assert.equal(summaryAt([payment({ amountCents: 12000 })], '2026-07-01'), 'Paid in full.');
  });

  test('an overpayment is reported as a credit, not as an error', () => {
    const summary = summaryAt([payment({ amountCents: 12500 })], '2026-07-01');
    assert.match(summary, /credit of \$5\.00/);
  });
});
