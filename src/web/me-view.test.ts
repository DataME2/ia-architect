import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  guardianScope,
  holdsCommitteeRole,
  initialsOf,
  nextFixture,
  seasonFigures,
  shortDate,
} from './me-view.ts';

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

describe('holdsCommitteeRole — the office is the fact (BR21, R30.1)', () => {
  const none = { membershipRoles: [], personRoles: [], servingPositions: [] };

  it('admits somebody elected to an office, with no access role at all', () => {
    // The reported bug: a president saw no governance workspace because the
    // screen asked whether her account had been granted a role rather than
    // whether she held an office.
    assert.equal(holdsCommitteeRole({ ...none, servingPositions: ['president'] }), true);
  });

  it('admits an elected officer whose account holds an unrelated role', () => {
    assert.equal(
      holdsCommitteeRole({ ...none, membershipRoles: ['coach'], servingPositions: ['secretary'] }),
      true,
    );
  });

  it('still admits the committee access role, which already worked', () => {
    assert.equal(holdsCommitteeRole({ ...none, membershipRoles: ['committee'] }), true);
  });

  it('still admits an admin — a club’s first administrator is usually its secretary', () => {
    assert.equal(holdsCommitteeRole({ ...none, membershipRoles: ['admin'] }), true);
  });

  it('admits the season role on the Person', () => {
    assert.equal(holdsCommitteeRole({ ...none, personRoles: ['committee'] }), true);
  });

  it('refuses somebody holding none of the three', () => {
    assert.equal(
      holdsCommitteeRole({
        membershipRoles: ['coach', 'treasurer'],
        personRoles: ['player', 'referee'],
        servingPositions: [],
      }),
      false,
    );
  });

  it('refuses a resigned officer — the caller narrows to who is still serving', () => {
    // Expressed in the input rather than here on purpose: whether a
    // resignation has taken effect is a date question the governance domain
    // already answers (`serving`), and answering it twice is how the two
    // answers start to differ.
    assert.equal(holdsCommitteeRole({ ...none, servingPositions: [] }), false);
  });
});
