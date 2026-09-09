import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { guardianScope, initialsOf, nextFixture, seasonFigures, shortDate } from './me-view.ts';

const fx = (id: string, playedOn: string, status = 'scheduled') => ({
  id,
  playedOn,
  opponent: 'Souths United',
  homeAway: 'home',
  venue: null,
  competition: null,
  status,
});

describe('nextFixture', () => {
  it('picks the soonest fixture on or after today', () => {
    const list = [fx('a', '2026-09-19'), fx('b', '2026-09-12'), fx('c', '2026-09-05')];
    assert.equal(nextFixture(list, '2026-09-09')?.id, 'b');
  });

  it('counts today as upcoming — the match is this afternoon', () => {
    assert.equal(nextFixture([fx('a', '2026-09-09')], '2026-09-09')?.id, 'a');
  });

  it('skips a cancelled fixture rather than sending someone to it', () => {
    const list = [fx('a', '2026-09-12', 'cancelled'), fx('b', '2026-09-19')];
    assert.equal(nextFixture(list, '2026-09-09')?.id, 'b');
  });

  it('answers null when the season is over', () => {
    assert.equal(nextFixture([fx('a', '2026-05-01')], '2026-09-09'), null);
  });
});

describe('seasonFigures', () => {
  it('adds up counts, never events', () => {
    const figs = seasonFigures([
      { minutesPlayed: 70, goals: 1, assists: 0 },
      { minutesPlayed: 90, goals: 2, assists: 1 },
    ]);
    assert.deepEqual(figs, { appearances: 2, minutes: 160, goals: 3, assists: 1 });
  });

  it('is all zeros for a player who has not taken the field', () => {
    assert.deepEqual(seasonFigures([]), { appearances: 0, minutes: 0, goals: 0, assists: 0 });
  });
});

describe('initialsOf', () => {
  it('takes the first two words', () => assert.equal(initialsOf('Dani Whitiora'), 'DW'));
  it('does not invent a second letter', () => assert.equal(initialsOf('Cher'), 'C'));
  it('ignores stray spacing', () => assert.equal(initialsOf('  Ari   Tumanako  '), 'AT'));
});

describe('guardianScope', () => {
  it('names one child', () => assert.equal(guardianScope(['Tané']), 'for Tané'));
  it('names two', () => assert.equal(guardianScope(['Tané', 'Mia']), 'for Tané and Mia'));
  it('counts three or more', () => assert.equal(guardianScope(['a', 'b', 'c']), 'for 3 children'));
  it('is null with no children', () => assert.equal(guardianScope([]), null));
});

describe('shortDate', () => {
  it('renders an Australian short date', () => assert.equal(shortDate('2026-09-12'), 'Sat 12 Sep'));
  it('passes through anything it cannot parse', () => assert.equal(shortDate('soon'), 'soon'));
});
