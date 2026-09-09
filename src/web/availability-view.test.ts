import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  availabilitySummary,
  orderRanges,
  orderWindows,
  overlappingPairs,
  overlaps,
  rangeLabel,
  rangeProblem,
  rangeState,
  shortTime,
  windowLabel,
  windowProblem,
  type AvailabilityWindow,
  type UnavailabilityRange,
} from './availability-view.ts';

const win = (over: Partial<AvailabilityWindow> = {}): AvailabilityWindow => ({
  id: 'w1',
  weekday: 6,
  fromTime: '08:00:00',
  toTime: '12:00:00',
  note: null,
  ...over,
});

const range = (over: Partial<UnavailabilityRange> = {}): UnavailabilityRange => ({
  id: 'r1',
  startsOn: '2026-07-01',
  endsOn: '2026-07-31',
  reason: 'away',
  ...over,
});

test('shortTime', async (t) => {
  await t.test('drops the seconds nobody reads', () => {
    assert.equal(shortTime('08:00:00'), '08:00');
    assert.equal(shortTime('08:00'), '08:00');
  });

  await t.test('leaves null alone — it means all day, not midnight', () => {
    assert.equal(shortTime(null), null);
  });
});

test('windowLabel', async (t) => {
  await t.test('reads as a person would say it', () => {
    assert.equal(windowLabel(win()), 'Saturdays, 08:00–12:00');
  });

  await t.test('an all-day window says so', () => {
    assert.equal(windowLabel(win({ weekday: 0, fromTime: null, toTime: null })), 'Sundays, all day');
  });

  await t.test('half a window is a complete thought', () => {
    // "Saturdays from 14:00" is something people actually say, and
    // demanding both ends would make somebody invent one.
    assert.equal(windowLabel(win({ toTime: null })), 'Saturdays, from 08:00');
    assert.equal(windowLabel(win({ fromTime: null })), 'Saturdays, until 12:00');
  });

  await t.test('weekday 0 is Sunday, matching the database', () => {
    assert.equal(windowLabel(win({ weekday: 0, fromTime: null, toTime: null })), 'Sundays, all day');
    assert.equal(windowLabel(win({ weekday: 6, fromTime: null, toTime: null })), 'Saturdays, all day');
  });
});

test('overlaps', async (t) => {
  await t.test('finds windows that describe the same hours', () => {
    assert.equal(overlaps(win(), win({ id: 'w2', fromTime: '10:00', toTime: '14:00' })), true);
  });

  await t.test('touching at an edge counts — 12:00 is in both', () => {
    assert.equal(overlaps(win(), win({ id: 'w2', fromTime: '12:00', toTime: '14:00' })), true);
  });

  await t.test('separate hours on the same day do not', () => {
    assert.equal(overlaps(win(), win({ id: 'w2', fromTime: '13:00', toTime: '17:00' })), false);
  });

  await t.test('different days never overlap', () => {
    assert.equal(overlaps(win(), win({ id: 'w2', weekday: 0 })), false);
  });

  await t.test('an all-day window overlaps everything on its day', () => {
    const allDay = win({ id: 'w2', fromTime: null, toTime: null });
    assert.equal(overlaps(allDay, win({ fromTime: '13:00', toTime: '17:00' })), true);
  });
});

test('overlappingPairs', async (t) => {
  await t.test('names the pair so a coordinator can see which to fix', () => {
    const a = win({ id: 'a' });
    const b = win({ id: 'b', fromTime: '10:00', toTime: '14:00' });
    const c = win({ id: 'c', weekday: 3 });
    const pairs = overlappingPairs([a, b, c]);
    assert.equal(pairs.length, 1);
    assert.deepEqual([pairs[0]![0].id, pairs[0]![1].id], ['a', 'b']);
  });

  await t.test('reports nothing when a week is tidy', () => {
    assert.deepEqual(overlappingPairs([win({ id: 'a' }), win({ id: 'b', weekday: 0 })]), []);
  });

  await t.test('does not pair a window with itself', () => {
    assert.deepEqual(overlappingPairs([win()]), []);
  });
});

test('orderWindows', async (t) => {
  await t.test('runs in the order a week does, then by start time', () => {
    const sat2 = win({ id: 'sat2', weekday: 6, fromTime: '14:00', toTime: '17:00' });
    const sat1 = win({ id: 'sat1', weekday: 6, fromTime: '08:00', toTime: '12:00' });
    const sun = win({ id: 'sun', weekday: 0, fromTime: null, toTime: null });
    assert.deepEqual(
      orderWindows([sat2, sun, sat1]).map((w) => w.id),
      ['sun', 'sat1', 'sat2'],
    );
  });
});

test('rangeState and rangeLabel', async (t) => {
  await t.test('knows past, current and future', () => {
    assert.equal(rangeState(range(), '2026-07-15'), 'current');
    assert.equal(rangeState(range(), '2026-08-15'), 'past');
    assert.equal(rangeState(range(), '2026-06-15'), 'future');
  });

  await t.test('its own boundary days are inside it', () => {
    assert.equal(rangeState(range(), '2026-07-01'), 'current');
    assert.equal(rangeState(range(), '2026-07-31'), 'current');
  });

  await t.test('a single day reads as one date', () => {
    assert.equal(rangeLabel(range({ startsOn: '2026-07-04', endsOn: '2026-07-04' })), '2026-07-04');
    assert.equal(rangeLabel(range()), '2026-07-01 – 2026-07-31');
  });
});

test('orderRanges', async (t) => {
  await t.test('what matters now first, history last', () => {
    const past = range({ id: 'past', startsOn: '2026-01-01', endsOn: '2026-01-31' });
    const now = range({ id: 'now', startsOn: '2026-07-01', endsOn: '2026-07-31' });
    const soon = range({ id: 'soon', startsOn: '2026-09-01', endsOn: '2026-09-30' });
    assert.deepEqual(
      orderRanges([past, soon, now], '2026-07-15').map((r) => r.id),
      ['now', 'soon', 'past'],
    );
  });

  await t.test('the most recent past comes before older past', () => {
    const older = range({ id: 'older', startsOn: '2026-01-01', endsOn: '2026-01-31' });
    const recent = range({ id: 'recent', startsOn: '2026-03-01', endsOn: '2026-03-31' });
    assert.deepEqual(
      orderRanges([older, recent], '2026-07-15').map((r) => r.id),
      ['recent', 'older'],
    );
  });
});

test('windowProblem', async (t) => {
  await t.test('accepts a whole day and a half-open window', () => {
    assert.equal(windowProblem('6', '', ''), null);
    assert.equal(windowProblem('6', '14:00', ''), null);
    assert.equal(windowProblem('6', '', '12:00'), null);
  });

  await t.test('refuses a window that ends before it starts', () => {
    const problem = windowProblem('6', '15:00', '09:00');
    assert.equal(problem?.field, 'time');
  });

  await t.test('refuses one that ends when it starts — that is no window', () => {
    assert.equal(windowProblem('6', '09:00', '09:00')?.field, 'time');
  });

  await t.test('refuses a day that is not a day', () => {
    assert.equal(windowProblem('', '', '')?.field, 'weekday');
    assert.equal(windowProblem('7', '', '')?.field, 'weekday');
    assert.equal(windowProblem('-1', '', '')?.field, 'weekday');
  });
});

test('rangeProblem', async (t) => {
  await t.test('needs both ends', () => {
    assert.match(rangeProblem('', '2026-07-31') ?? '', /first day/);
    assert.match(rangeProblem('2026-07-01', '') ?? '', /last day/);
  });

  await t.test('refuses a range that runs backwards', () => {
    assert.match(rangeProblem('2026-07-31', '2026-07-01') ?? '', /cannot come before/);
  });

  await t.test('accepts a single day', () => {
    assert.equal(rangeProblem('2026-07-04', '2026-07-04'), null);
  });
});

test('availabilitySummary', async (t) => {
  await t.test('says out loud that nothing was declared', () => {
    // Silence is not availability. A blank cell would read as "no
    // restrictions" when it actually means "will never be offered".
    const summary = availabilitySummary([], [], '2026-07-15');
    assert.match(summary, /Nothing declared/);
    assert.match(summary, /will not be offered/);
  });

  await t.test('lists the week and counts what is still to come', () => {
    const summary = availabilitySummary([win()], [range()], '2026-06-15');
    assert.match(summary, /Saturdays, 08:00–12:00/);
    assert.match(summary, /1 period away/);
  });

  await t.test('does not count a period that has already passed', () => {
    const summary = availabilitySummary([win()], [range()], '2026-08-15');
    assert.equal(summary, 'Saturdays, 08:00–12:00');
  });
});
