import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayMonthYear, jurisdictionName, standingWord } from './club-profile-view.ts';

test('a jurisdiction is named, and an unknown one is shown as it is', () => {
  assert.equal(jurisdictionName('AU-QLD'), 'Queensland, Australia');
  assert.equal(jurisdictionName('NZ'), 'New Zealand');
  assert.equal(jurisdictionName('AU-XX'), 'AU-XX');
});

test('a lapsed licence is red, and no licence is not the same as a lapsed one', () => {
  assert.equal(standingWord({ kind: 'lapsed', daysAgo: 3 }).tone, 'pill pill-stop');
  assert.equal(standingWord({ kind: 'none' }).label, 'No licence recorded');
  assert.equal(standingWord({ kind: 'active', daysLeft: 200 }).label, 'Licensed');
  assert.equal(standingWord({ kind: 'expiring', daysLeft: 20 }).tone, 'pill pill-warn');
});

test('dates read as day, month and year', () => {
  assert.equal(dayMonthYear('2026-07-01'), '1 Jul 2026');
  assert.equal(dayMonthYear('2026-12-31T00:00:00Z'), '31 Dec 2026');
});
