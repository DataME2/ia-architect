import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ladder, nextFixtureFor, type CarnivalEntry, type CarnivalFixture } from './ladder.ts';

const POINTS = { win: 3, draw: 1 };

const entry = (id: string, entrantName: string, teamName = 'U12'): CarnivalEntry =>
  ({ id, entrantName, teamName });

const played = (
  home: string, away: string, hg: number | null, ag: number | null,
  over: Partial<CarnivalFixture> = {},
): CarnivalFixture => ({
  id: `${home}-${away}`,
  homeEntryId: home, awayEntryId: away,
  playedOn: '2026-07-04', kickOff: '10:00', venue: 'Pitch 1',
  homeGoals: hg, awayGoals: ag,
  status: 'played',
  ...over,
});

const ENTRIES = [entry('a', 'North Star'), entry('b', 'Coast'), entry('c', 'Ranges')];

test('ladder — BR26, what four hundred strangers read on a phone', async (t) => {
  await t.test('orders by points, then goal difference, then goals for', () => {
    const table = ladder(ENTRIES, [
      played('a', 'b', 3, 0),   // North Star +3
      played('c', 'b', 1, 0),   // Ranges +1
    ], POINTS);

    assert.deepEqual(table.map((r) => r.entrantName), ['North Star', 'Ranges', 'Coast']);
    assert.equal(table[0]?.points, 3);
    assert.equal(table[0]?.goalDifference, 3);
  });

  await t.test('breaks a dead tie alphabetically, not by insertion order', () => {
    // A table that reorders itself between refreshes reads as broken.
    const table = ladder([entry('z', 'Zephyr'), entry('a', 'Aurora')], [], POINTS);
    assert.deepEqual(table.map((r) => r.entrantName), ['Aurora', 'Zephyr']);
  });

  await t.test('counts a draw for both sides', () => {
    const table = ladder(ENTRIES, [played('a', 'b', 2, 2)], POINTS);
    assert.equal(table.find((r) => r.entryId === 'a')?.points, 1);
    assert.equal(table.find((r) => r.entryId === 'b')?.points, 1);
  });

  await t.test('ignores a cancelled or abandoned game', () => {
    // Counting either invents a fact nobody agreed on.
    const table = ladder(ENTRIES, [
      played('a', 'b', 5, 0, { status: 'cancelled' }),
      played('a', 'c', 5, 0, { status: 'abandoned' }),
    ], POINTS);
    assert.equal(table.find((r) => r.entryId === 'a')?.played, 0);
  });

  await t.test('ignores a fixture with no score yet', () => {
    const table = ladder(ENTRIES, [played('a', 'b', null, null, { status: 'scheduled' })], POINTS);
    assert.equal(table.find((r) => r.entryId === 'a')?.played, 0);
  });

  await t.test('honours the carnival’s own points system (BR29)', () => {
    const table = ladder(ENTRIES, [played('a', 'b', 1, 0)], { win: 2, draw: 1 });
    assert.equal(table[0]?.points, 2);
  });

  await t.test('lists an entry that has played nothing', () => {
    const table = ladder(ENTRIES, [], POINTS);
    assert.equal(table.length, 3);
    assert.equal(table[0]?.played, 0);
  });
});

test('nextFixtureFor — BR26', async (t) => {
  const scheduled = (id: string, on: string, at: string | null): CarnivalFixture =>
    played('a', 'b', null, null, { id, playedOn: on, kickOff: at, status: 'scheduled' });

  await t.test('takes the earliest unplayed fixture', () => {
    const next = nextFixtureFor('a', [scheduled('late', '2026-07-05', '09:00'), scheduled('early', '2026-07-04', '15:00')]);
    assert.equal(next?.id, 'early');
  });

  await t.test('sorts a fixture with no kick-off last within its day', () => {
    // A time nobody set is less certain than one somebody did, and showing
    // it first sends a family to the ground too early.
    const next = nextFixtureFor('a', [scheduled('unset', '2026-07-04', null), scheduled('set', '2026-07-04', '14:00')]);
    assert.equal(next?.id, 'set');
  });

  await t.test('ignores a played fixture, and returns null when there is none', () => {
    assert.equal(nextFixtureFor('a', [played('a', 'b', 1, 0)]), null);
    assert.equal(nextFixtureFor('nobody', [scheduled('x', '2026-07-04', '10:00')]), null);
  });
});
