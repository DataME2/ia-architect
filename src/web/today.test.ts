import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { DEFAULT_TIME_ZONE, isoWeek, todayIn, weekLabel } from './today.ts';

describe('todayIn', () => {
  test('formats as YYYY-MM-DD', () => {
    assert.equal(todayIn('UTC', new Date('2026-08-19T04:30:00Z')), '2026-08-19');
  });

  test('is already tomorrow in Brisbane while UTC is still yesterday', () => {
    // 14:00 UTC on the 18th is midnight on the 19th in Brisbane (UTC+10).
    // A registrar working that evening must not see the previous day.
    const instant = new Date('2026-08-18T14:00:00Z');
    assert.equal(todayIn('UTC', instant), '2026-08-18');
    assert.equal(todayIn('Australia/Brisbane', instant), '2026-08-19');
  });

  test('does not shift Brisbane for daylight saving', () => {
    // Queensland does not observe it; January and July must both be UTC+10.
    assert.equal(
      todayIn('Australia/Brisbane', new Date('2026-01-15T14:00:00Z')),
      '2026-01-16',
    );
    assert.equal(
      todayIn('Australia/Brisbane', new Date('2026-07-15T14:00:00Z')),
      '2026-07-16',
    );
  });

  test('follows Sydney across a daylight-saving boundary', () => {
    // Sydney is UTC+11 in January and UTC+10 in July, so the same clock time
    // lands on different dates. Proves the timezone is really being applied.
    assert.equal(todayIn('Australia/Sydney', new Date('2026-01-15T13:30:00Z')), '2026-01-16');
    assert.equal(todayIn('Australia/Sydney', new Date('2026-07-15T13:30:00Z')), '2026-07-15');
  });

  test('defaults to the pilot club’s timezone', () => {
    assert.equal(DEFAULT_TIME_ZONE, 'Australia/Brisbane');
    const instant = new Date('2026-08-18T14:00:00Z');
    assert.equal(todayIn(undefined, instant), '2026-08-19');
  });
});

describe('isoWeek and weekLabel', () => {
  test('numbers the week Monday to Sunday', () => {
    assert.equal(weekLabel('2026-10-24'), 'Week 43 · 19–25 Oct');
    assert.equal(weekLabel('2026-10-19'), 'Week 43 · 19–25 Oct');
    assert.equal(weekLabel('2026-10-25'), 'Week 43 · 19–25 Oct');
  });

  test('spans a month with both names', () => {
    assert.equal(weekLabel('2026-10-01'), 'Week 40 · 28 Sep – 4 Oct');
  });

  test('follows ISO at the turn of the year', () => {
    assert.equal(isoWeek('2026-01-01').week, 1); // a Thursday
    assert.equal(isoWeek('2027-01-01').week, 53); // 2026 has 53 weeks
    assert.equal(weekLabel('2024-12-30'), 'Week 1 · 30 Dec – 5 Jan');
  });
});
