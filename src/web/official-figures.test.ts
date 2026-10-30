import assert from 'node:assert/strict';
import { test } from 'node:test';

import { historyWord, officialFigures, type AppointmentFact } from './official-figures.ts';

const TODAY = '2026-10-30';
const row = (state: AppointmentFact['state'], playedOn: string, fixtureStatus = 'scheduled'): AppointmentFact => ({
  state,
  playedOn,
  fixtureStatus,
});

test('reliability counts only commitments that have come due', () => {
  const f = officialFigures(
    [row('accepted', '2026-10-01'), row('accepted', '2026-10-10'), row('withdrawn', '2026-10-17'), row('accepted', '2026-11-07')],
    TODAY,
  );
  assert.equal(f.officiated, 2);
  assert.equal(f.reliability, 67); // 2 of 3 due; the match on 7 Nov proves nothing yet
  assert.equal(f.cancellationRate, 25); // 1 withdrawal of 4 accepted
  assert.equal(f.upcoming, 1);
});

test('a decline is availability, not a cancellation', () => {
  const f = officialFigures([row('declined', '2026-10-01'), row('accepted', '2026-10-02')], TODAY);
  assert.equal(f.cancellationRate, 0);
  assert.equal(f.reliability, 100);
  assert.equal(f.declined, 1);
});

test('a match that was not played counts for nobody', () => {
  const f = officialFigures([row('withdrawn', '2026-10-01', 'cancelled'), row('accepted', '2026-10-02', 'abandoned')], TODAY);
  assert.equal(f.reliability, null);
  assert.equal(f.cancellationRate, null);
  assert.deepEqual(historyWord(row('accepted', '2026-10-02', 'abandoned'), TODAY), { word: 'Match not played', tone: 'neutral' });
});

test('with nothing recorded there is no figure, not a zero', () => {
  const f = officialFigures([], TODAY);
  assert.equal(f.reliability, null);
  assert.equal(f.cancellationRate, null);
});

test('a past acceptance reads as officiated, a future one as accepted', () => {
  assert.equal(historyWord(row('accepted', '2026-10-01'), TODAY).word, 'Officiated');
  assert.equal(historyWord(row('accepted', '2026-11-01'), TODAY).word, 'Accepted');
});
