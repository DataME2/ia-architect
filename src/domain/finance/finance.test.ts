import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { payment } from '../test-fixtures.ts';
import { advance, buildSchedule, finishesWithinSeason, planState } from './plan.ts';
import type { Installment } from './types.ts';

function schedule(totalCents: number, count: number, from = '2026-03-01'): readonly Installment[] {
  const result = buildSchedule(totalCents, count, from, 'monthly');
  assert.ok(result.ok, 'expected a schedule');
  return result.installments;
}

describe('building a schedule (BR74)', () => {
  test('instalments sum to exactly the total, whatever the remainder', () => {
    for (const total of [12000, 12050, 9999, 1, 100003]) {
      for (const count of [1, 2, 3, 4, 7, 12]) {
        if (count > total) continue;
        const parts = schedule(total, count);
        const sum = parts.reduce((n, i) => n + i.amountCents, 0);
        assert.equal(sum, total, `${total} over ${count} instalments`);
      }
    }
  });

  test('the remainder lands on the first instalment, not the last', () => {
    // $120.50 over three is $40.1666… — two cents cannot be split.
    const parts = schedule(12050, 3);
    assert.deepEqual(
      parts.map((i) => i.amountCents),
      [4018, 4016, 4016],
    );
  });

  test('every instalment is worth something', () => {
    for (const part of schedule(12050, 3)) {
      assert.ok(part.amountCents > 0, 'a zero instalment is a date nobody pays on');
    }
  });

  test('sequences are 1-based and in due-date order', () => {
    const parts = schedule(12000, 4);
    assert.deepEqual(
      parts.map((i) => i.sequence),
      [1, 2, 3, 4],
    );
    assert.deepEqual(
      parts.map((i) => i.dueOn),
      ['2026-03-01', '2026-04-01', '2026-05-01', '2026-06-01'],
    );
  });

  test('refuses a split that would make an instalment worth nothing', () => {
    const result = buildSchedule(5, 6, '2026-03-01', 'monthly');
    assert.ok(!result.ok);
    assert.match(result.error, /worth nothing/);
  });

  test('refuses a non-positive total and a zero count', () => {
    assert.ok(!buildSchedule(0, 3, '2026-03-01', 'monthly').ok);
    assert.ok(!buildSchedule(-100, 3, '2026-03-01', 'monthly').ok);
    assert.ok(!buildSchedule(12000, 0, '2026-03-01', 'monthly').ok);
  });

  test('one instalment is a plan, and equals the whole total', () => {
    const parts = schedule(12050, 1);
    assert.equal(parts.length, 1);
    assert.equal(parts[0]?.amountCents, 12050);
  });
});

describe('cadence', () => {
  test('weekly and fortnightly step by days', () => {
    assert.equal(advance('2026-03-01', 'weekly', 3), '2026-03-22');
    assert.equal(advance('2026-03-01', 'fortnightly', 2), '2026-03-29');
  });

  test('monthly from the 31st clamps to the end of a short month', () => {
    // Rolling into 3 March would put the instalment in a different month
    // from the one the family was told about.
    assert.equal(advance('2026-01-31', 'monthly', 1), '2026-02-28');
    assert.equal(advance('2026-01-31', 'monthly', 3), '2026-04-30');
  });

  test('clamping does not stick — a later month recovers the 31st', () => {
    assert.equal(advance('2026-01-31', 'monthly', 2), '2026-03-31');
  });

  test('a leap February is respected', () => {
    assert.equal(advance('2028-01-31', 'monthly', 1), '2028-02-29');
  });

  test('crosses a year boundary', () => {
    assert.equal(advance('2026-11-15', 'monthly', 3), '2027-02-15');
  });
});

describe('the season boundary (BR76)', () => {
  test('a plan finishing inside the season passes', () => {
    assert.equal(finishesWithinSeason(schedule(12000, 4), '2026-12-01'), true);
  });

  test('a plan running past the end of the season does not', () => {
    // Four monthly instalments from March end in June; a season ending in
    // May leaves the club chasing a child who has stopped playing.
    assert.equal(finishesWithinSeason(schedule(12000, 4), '2026-05-01'), false);
  });

  test('landing exactly on the last day is inside it', () => {
    assert.equal(finishesWithinSeason(schedule(12000, 4), '2026-06-01'), true);
  });
});

describe('where a plan stands', () => {
  const parts = schedule(12000, 4); // 3000 each, 1 March through 1 June

  test('nothing paid, nothing yet due', () => {
    const state = planState(12000, parts, [], '2026-02-15');
    assert.equal(state.paidCents, 0);
    assert.equal(state.outstandingCents, 12000);
    assert.equal(state.arrearsCents, 0, 'not late until a due date has passed');
    assert.equal(state.nextDue?.installment.sequence, 1);
  });

  test('an instalment due today is not yet in arrears', () => {
    const state = planState(12000, parts, [], '2026-03-01');
    assert.equal(state.arrearsCents, 0, 'the family has the day to pay it');
  });

  test('and is in arrears the day after', () => {
    const state = planState(12000, parts, [], '2026-03-02');
    assert.equal(state.arrearsCents, 3000);
  });

  test('paying on time keeps arrears at zero with a balance outstanding', () => {
    const state = planState(12000, parts, [payment({ amountCents: 3000 })], '2026-03-15');
    assert.equal(state.arrearsCents, 0);
    assert.equal(state.outstandingCents, 9000);
    assert.equal(state.nextDue?.installment.sequence, 2);
  });

  test('payments allocate oldest instalment first, and spill over', () => {
    const state = planState(12000, parts, [payment({ amountCents: 7000 })], '2026-04-15');
    assert.deepEqual(
      state.installments.map((i) => i.paidCents),
      [3000, 3000, 1000, 0],
    );
    assert.equal(state.arrearsCents, 0, 'two due, both covered');
  });

  test('a partial payment leaves the shortfall as arrears', () => {
    const state = planState(12000, parts, [payment({ amountCents: 2500 })], '2026-03-15');
    assert.equal(state.arrearsCents, 500);
  });

  test('a refund reopens arrears rather than being ignored', () => {
    const state = planState(
      12000,
      parts,
      [payment({ amountCents: 3000 }), payment({ id: 'p2', amountCents: -3000 })],
      '2026-03-15',
    );
    assert.equal(state.paidCents, 0);
    assert.equal(state.arrearsCents, 3000);
  });

  test('paid in full leaves no arrears and nothing next', () => {
    const state = planState(12000, parts, [payment({ amountCents: 12000 })], '2026-07-01');
    assert.equal(state.outstandingCents, 0);
    assert.equal(state.arrearsCents, 0);
    assert.equal(state.nextDue, null);
  });

  test('overpayment does not create a negative instalment', () => {
    const state = planState(12000, parts, [payment({ amountCents: 15000 })], '2026-07-01');
    assert.equal(state.outstandingCents, -3000, 'the club holds a credit');
    for (const part of state.installments) {
      assert.ok(part.paidCents <= part.installment.amountCents);
      assert.ok(part.outstandingCents >= 0);
    }
  });

  test('allocation is order-independent — it re-derives from the receipts', () => {
    const a = [payment({ amountCents: 1000 }), payment({ id: 'p2', amountCents: 5000 })];
    const b = [payment({ id: 'p2', amountCents: 5000 }), payment({ amountCents: 1000 })];
    assert.deepEqual(planState(12000, parts, a, '2026-04-15'), planState(12000, parts, b, '2026-04-15'));
  });
});
