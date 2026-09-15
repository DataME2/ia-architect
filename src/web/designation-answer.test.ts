import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  awaitingAnswer,
  isAdultOn,
  parseAnswer,
  proposedTo,
  roleLabel,
  type OfferedDesignation,
} from './designation-answer.ts';

describe('isAdultOn — the same arithmetic the database uses', () => {
  it('is true on the eighteenth birthday and false the day before', () => {
    assert.equal(isAdultOn('2008-06-01', '2026-05-31'), false);
    assert.equal(isAdultOn('2008-06-01', '2026-06-01'), true);
  });

  it('treats a twelve-year-old MiniRef as a child', () => {
    assert.equal(isAdultOn('2014-03-09', '2026-09-15'), false);
  });

  it('treats an unknown date of birth as a child, so an adult is asked', () => {
    // The opposite default to BR84's, and deliberately: not knowing
    // somebody's age is a reason to ask a parent, not a reason to skip one.
    assert.equal(isAdultOn(null, '2026-09-15'), false);
    assert.equal(isAdultOn('', '2026-09-15'), false);
    assert.equal(isAdultOn('not-a-date', '2026-09-15'), false);
  });

  it('handles a 29 February birthday without claiming an extra year', () => {
    assert.equal(isAdultOn('2008-02-29', '2026-02-28'), false);
    assert.equal(isAdultOn('2008-02-29', '2026-03-01'), true);
  });
});

describe('proposedTo — BR113, said in a sentence', () => {
  it('names the guardian the question went to', () => {
    assert.equal(
      proposedTo('Ana', ['Marta Reina'], true),
      'Proposed to Marta Reina, who answers for Ana (BR113).',
    );
  });

  it('names both guardians when two hold authority', () => {
    assert.match(proposedTo('Ana', ['Marta', 'Diego'], true), /Marta and Diego/);
  });

  it('says an adult answers for themselves', () => {
    assert.match(proposedTo('Ana', [], false), /answers for themselves/);
  });

  it('says plainly that nobody can answer, rather than "awaiting a response"', () => {
    // The coordinator's actionable fact is the missing guardianship record,
    // which is also what the database refuses the designation over.
    assert.match(proposedTo('Ana', [], true), /no Parent\/Guardian holding authority/);
  });
});

describe('parseAnswer — BR42, before the database has to say it', () => {
  it('takes an acceptance with no reason', () => {
    const parsed = parseAnswer({ id: 'a1', answer: 'accept' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.accept, true);
    assert.equal(parsed.ok && parsed.reason, null);
  });

  it('refuses a decline with no reason, naming the rule', () => {
    const parsed = parseAnswer({ id: 'a1', answer: 'decline' });
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok === false ? parsed.message : '', /BR42/);
  });

  it('treats whitespace as no reason at all', () => {
    assert.equal(parseAnswer({ id: 'a1', answer: 'decline', reason: '  \n' }).ok, false);
  });

  it('takes a decline that carries one', () => {
    const parsed = parseAnswer({ id: 'a1', answer: 'decline', reason: 'She has a test.' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.reason, 'She has a test.');
  });

  it('refuses an answer that is neither', () => {
    assert.equal(parseAnswer({ id: 'a1', answer: 'maybe' }).ok, false);
    assert.equal(parseAnswer({ id: 'a1' }).ok, false);
  });

  it('refuses an answer to nothing', () => {
    assert.equal(parseAnswer({ answer: 'accept' }).ok, false);
  });
});

describe('awaitingAnswer — only what is actually a question', () => {
  const at = (id: string, state: OfferedDesignation['state'], playedOn: string, kickOff: string | null) => ({
    id,
    officialName: 'Ana',
    answeredByAnAdult: true,
    opponent: 'Rivals',
    playedOn,
    kickOff,
    role: 'referee',
    state,
    reason: null,
  });

  it('keeps proposals and drops everything already settled', () => {
    const rows = awaitingAnswer([
      at('a', 'accepted', '2026-10-01', '09:00'),
      at('b', 'proposed', '2026-10-02', '09:00'),
      at('c', 'withdrawn', '2026-10-03', '09:00'),
      at('d', 'declined', '2026-10-04', '09:00'),
    ]);
    assert.deepEqual(rows.map((r) => r.id), ['b']);
  });

  it('puts the soonest fixture first, and orders a shared date by kick-off', () => {
    const rows = awaitingAnswer([
      at('late', 'proposed', '2026-10-05', '13:00'),
      at('early', 'proposed', '2026-10-05', '09:00'),
      at('sooner', 'proposed', '2026-10-01', '15:00'),
    ]);
    assert.deepEqual(rows.map((r) => r.id), ['sooner', 'early', 'late']);
  });

  it('does not reorder its argument', () => {
    const given = [at('b', 'proposed', '2026-10-05', '09:00'), at('a', 'proposed', '2026-10-01', '09:00')];
    awaitingAnswer(given);
    assert.deepEqual(given.map((r) => r.id), ['b', 'a']);
  });
});

describe('roleLabel', () => {
  it('spells out the roles the schema stores', () => {
    assert.equal(roleLabel('assistant_referee'), 'Assistant referee');
    assert.equal(roleLabel('fourth_official'), 'Fourth official');
  });

  it('shows an unknown role rather than hiding it', () => {
    assert.equal(roleLabel('timekeeper'), 'timekeeper');
  });
});
