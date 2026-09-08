import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { person } from '../test-fixtures.ts';
import {
  daysUntilAgm,
  mayHoldCommitteePosition,
  governingTerm,
  serving,
  termStatus,
  vacantOffices,
  type CommitteeMember,
  type CommitteeTerm,
} from './term.ts';

function term(overrides: Partial<CommitteeTerm> = {}): CommitteeTerm {
  return {
    id: 't-2026',
    name: '2026–27',
    agmHeldOn: '2026-03-01',
    startsOn: '2026-03-01',
    nextAgmDueOn: '2027-03-01',
    ...overrides,
  };
}

function member(overrides: Partial<CommitteeMember> = {}): CommitteeMember {
  return {
    id: 'm-1',
    termId: 't-2026',
    personId: 'p-1',
    position: 'president',
    electedOn: '2026-03-01',
    resignedOn: null,
    ...overrides,
  };
}

describe('BR85/BR86 — the governance year', () => {
  test('a fresh term is current', () => {
    assert.equal(termStatus(term(), '2026-06-01'), 'current');
  });

  test('inside 60 days of the AGM falling due, it warns', () => {
    assert.equal(termStatus(term(), '2027-01-15'), 'due-soon');
  });

  test('on the day the AGM is due it is still not overdue', () => {
    assert.equal(termStatus(term(), '2027-03-01'), 'due-soon');
  });

  test('the day after, the mandate has lapsed', () => {
    assert.equal(termStatus(term(), '2027-03-02'), 'overdue');
  });

  test('a term prepared before its meeting has not started', () => {
    assert.equal(termStatus(term({ agmHeldOn: null }), '2026-02-01'), 'not-yet-started');
  });

  test('overdue is measured against the AGM date, not a year from the start', () => {
    // A club that held its AGM three months late has a committee whose
    // authority is a real question. Computing "start + 1 year" would answer
    // it wrongly and silently.
    const late = term({ startsOn: '2026-06-01', nextAgmDueOn: '2027-03-01' });
    assert.equal(termStatus(late, '2027-04-01'), 'overdue');
    assert.equal(daysUntilAgm(late, '2027-04-01'), -31);
  });

  test('counts the days a secretary needs to call the meeting', () => {
    assert.equal(daysUntilAgm(term(), '2027-02-01'), 28);
  });
});

describe('which committee is governing', () => {
  const first = term({ id: 'a', name: '2025–26', startsOn: '2025-03-01', nextAgmDueOn: '2026-03-01' });
  const second = term({ id: 'b', name: '2026–27', startsOn: '2026-03-01', nextAgmDueOn: '2027-03-01' });

  test('the most recently started term that has begun', () => {
    assert.equal(governingTerm([first, second], '2026-06-01')?.id, 'b');
    assert.equal(governingTerm([first, second], '2025-09-01')?.id, 'a');
  });

  test('a term not yet started does not govern', () => {
    assert.equal(governingTerm([first, second], '2025-01-01'), null);
  });

  test('an overdue term still governs — the club has a committee, just an unrenewed one', () => {
    // Saying nobody is in charge would describe reality worse than saying
    // the mandate lapsed.
    assert.equal(governingTerm([first], '2027-06-01')?.id, 'a');
  });

  test('no terms at all is null, not a guess', () => {
    assert.equal(governingTerm([], '2026-06-01'), null);
  });
});

describe('who is serving', () => {
  test('a resignation is an early exit, and takes effect from its date', () => {
    const members = [
      member({ id: 'stays' }),
      member({ id: 'left', position: 'treasurer', resignedOn: '2026-08-01' }),
    ];
    assert.deepEqual(
      serving(members, '2026-06-01').map((m) => m.id),
      ['stays', 'left'],
      'still serving before the resignation date',
    );
    assert.deepEqual(
      serving(members, '2026-09-01').map((m) => m.id),
      ['stays'],
    );
  });
});

describe('the offices a constitution expects', () => {
  test('reports what is missing rather than refusing an incomplete committee', () => {
    const vacant = vacantOffices([member({ position: 'president' })], '2026-06-01');
    assert.deepEqual(vacant, ['secretary', 'treasurer']);
  });

  test('a full slate has no vacancies', () => {
    const full = [
      member({ id: '1', position: 'president' }),
      member({ id: '2', position: 'secretary' }),
      member({ id: '3', position: 'treasurer' }),
      member({ id: '4', position: 'committee-member' }),
    ];
    assert.deepEqual(vacantOffices(full, '2026-06-01'), []);
  });

  test('a resigned treasurer reopens the vacancy', () => {
    // The office is empty from the day they leave, which is exactly when
    // the club needs to know.
    const members = [
      member({ id: '1', position: 'president' }),
      member({ id: '2', position: 'secretary' }),
      member({ id: '3', position: 'treasurer', resignedOn: '2026-08-01' }),
    ];
    assert.deepEqual(vacantOffices(members, '2026-07-01'), []);
    assert.deepEqual(vacantOffices(members, '2026-09-01'), ['treasurer']);
  });

  test('an empty committee is all three offices vacant', () => {
    assert.deepEqual(vacantOffices([], '2026-06-01'), ['president', 'secretary', 'treasurer']);
  });
});

describe('BR87 — a committee is adults', () => {
  const TERM_START = '2026-03-01';

  function aged(dateOfBirth: string) {
    return person({ dateOfBirth });
  }

  test('a MiniRoos player cannot govern the club', () => {
    assert.equal(mayHoldCommitteePosition(aged('2018-06-01'), TERM_START), false);
  });

  test('their parent can', () => {
    assert.equal(mayHoldCommitteePosition(aged('1988-06-01'), TERM_START), true);
  });

  test('and so can a life member — the filter is age, never tenure or playing', () => {
    assert.equal(mayHoldCommitteePosition(aged('1940-01-01'), TERM_START), true);
  });

  test('exactly 18 on the day the term starts is old enough', () => {
    assert.equal(mayHoldCommitteePosition(aged('2008-03-01'), TERM_START), true);
  });

  test('one day short is not', () => {
    assert.equal(mayHoldCommitteePosition(aged('2008-03-02'), TERM_START), false);
  });

  test('measured at the term start, not today — a committee elected in March is March’s adults', () => {
    // Turns 18 in June. Not eligible for a term that began in March, even
    // though they are an adult by the time anyone looks at the screen.
    const juneBirthday = aged('2008-06-01');
    assert.equal(mayHoldCommitteePosition(juneBirthday, TERM_START), false);
    assert.equal(mayHoldCommitteePosition(juneBirthday, '2026-09-01'), true);
  });

  test('a guardian created by the public form counts as an adult', () => {
    // The placeholder date of birth reads as 1900, which is the safe way
    // round here: it never wrongly excludes a real parent.
    assert.equal(mayHoldCommitteePosition(aged('1900-01-01'), TERM_START), true);
  });
});
