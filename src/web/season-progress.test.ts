import assert from 'node:assert/strict';
import { test } from 'node:test';

import { seasonProgress } from './season-progress.ts';

test('half way through a season, half the bar is drawn', () => {
  const p = seasonProgress('2026-01-01', '2026-12-31', '2026-07-02');
  assert.equal(p.phase, 'during');
  assert.equal(p.percent, 50);
  assert.equal(p.week, 27);
  assert.equal(p.weeks, 52);
  assert.equal(p.daysLeft, 182);
});

test('before the season nothing is drawn, after it everything is', () => {
  assert.deepEqual(seasonProgress('2027-01-08', '2027-09-30', '2026-10-30'), {
    percent: 0,
    week: 0,
    weeks: 38,
    daysLeft: 265,
    phase: 'before',
  });
  const after = seasonProgress('2026-01-01', '2026-06-30', '2026-10-30');
  assert.equal(after.percent, 100);
  assert.equal(after.daysLeft, 0);
  assert.equal(after.phase, 'after');
});

test('the first day is week 1', () => {
  assert.equal(seasonProgress('2026-03-23', '2026-09-20', '2026-03-23').week, 1);
});
