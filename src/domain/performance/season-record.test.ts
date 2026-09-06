import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mostRecentFirst, seasonRecord, unusedSubstitute } from './season-record.ts';
import type { Appearance } from './types.ts';

const app = (over: Partial<Appearance> = {}): Appearance => ({
  fixtureId: 'f1',
  playedOn: '2026-04-04',
  opponent: 'Rival United',
  homeAway: 'home',
  competition: null,
  minutesPlayed: 60,
  started: true,
  goals: 0,
  assists: 0,
  recordedBy: 'u1',
  recordedAt: '2026-04-04T12:00:00Z',
  ...over,
});

test('an empty season is zeroes, not nulls', () => {
  const r = seasonRecord([]);
  assert.equal(r.appearances, 0);
  assert.equal(r.minutesPlayed, 0);
  assert.equal(r.goalContributions, 0);
});

test('starts and substitute appearances add up to appearances', () => {
  const r = seasonRecord([app(), app({ started: false }), app({ started: false })]);
  assert.equal(r.appearances, 3);
  assert.equal(r.starts, 1);
  assert.equal(r.substituteAppearances, 2);
});

test('goal contributions are goals plus assists', () => {
  const r = seasonRecord([app({ goals: 2, assists: 1 }), app({ goals: 0, assists: 3 })]);
  assert.equal(r.goals, 2);
  assert.equal(r.assists, 4);
  assert.equal(r.goalContributions, 6);
});

test('minutes accumulate across appearances', () => {
  const r = seasonRecord([app({ minutesPlayed: 90 }), app({ minutesPlayed: 12 })]);
  assert.equal(r.minutesPlayed, 102);
});

test('a named but unused substitute is distinguishable from an empty season', () => {
  // Zero minutes across several appearances is worth stating; no
  // appearances at all is a different fact and must not read the same.
  assert.equal(unusedSubstitute([app({ minutesPlayed: 0 }), app({ minutesPlayed: 0 })]), true);
  assert.equal(unusedSubstitute([]), false);
  assert.equal(unusedSubstitute([app({ minutesPlayed: 0 }), app({ minutesPlayed: 5 })]), false);
});

test('a season reads backwards from the most recent game', () => {
  const sorted = mostRecentFirst([
    app({ fixtureId: 'a', playedOn: '2026-03-01' }),
    app({ fixtureId: 'b', playedOn: '2026-05-01' }),
    app({ fixtureId: 'c', playedOn: '2026-04-01' }),
  ]);
  assert.deepEqual(
    sorted.map((a) => a.fixtureId),
    ['b', 'c', 'a'],
  );
});

test('sorting does not mutate the input', () => {
  const input = [app({ fixtureId: 'a', playedOn: '2026-03-01' }), app({ fixtureId: 'b', playedOn: '2026-05-01' })];
  mostRecentFirst(input);
  assert.equal(input[0]?.fixtureId, 'a');
});
