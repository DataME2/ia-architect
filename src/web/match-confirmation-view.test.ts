import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { parseMatchConfirmation, wasUnderThirteenOn } from './match-confirmation-view.ts';

describe('wasUnderThirteenOn — measured against the fixture, not today', () => {
  it('is true the day before the thirteenth birthday, false on it', () => {
    assert.equal(wasUnderThirteenOn('2014-03-09', '2027-03-08'), true);
    assert.equal(wasUnderThirteenOn('2014-03-09', '2027-03-09'), false);
  });

  it('treats an unknown date of birth as not offered', () => {
    assert.equal(wasUnderThirteenOn(null, '2026-09-15'), false);
    assert.equal(wasUnderThirteenOn('', '2026-09-15'), false);
  });

  it('a MiniRef who has since turned adult was still under 13 on an old fixture', () => {
    // Nine years ago — the person may be 21 now, but the question is about
    // that Saturday, not about them.
    assert.equal(wasUnderThirteenOn('2014-03-09', '2026-06-01'), true);
  });
});

describe('parseMatchConfirmation — an optional score, never negative', () => {
  it('accepts a confirmation with no score', () => {
    const parsed = parseMatchConfirmation({ fixtureId: 'f1', personId: 'p1' });
    assert.deepEqual(parsed, { ok: true, fixtureId: 'f1', personId: 'p1', homeScore: null, awayScore: null });
  });

  it('accepts a confirmation with both scores', () => {
    const parsed = parseMatchConfirmation({ fixtureId: 'f1', personId: 'p1', homeScore: '3', awayScore: '1' });
    assert.deepEqual(parsed, { ok: true, fixtureId: 'f1', personId: 'p1', homeScore: 3, awayScore: 1 });
  });

  it('refuses a negative or non-integer score', () => {
    assert.equal(parseMatchConfirmation({ fixtureId: 'f1', personId: 'p1', homeScore: '-1' }).ok, false);
    assert.equal(parseMatchConfirmation({ fixtureId: 'f1', personId: 'p1', homeScore: '2.5' }).ok, false);
  });

  it('refuses with nothing to confirm when identifiers are missing', () => {
    assert.equal(parseMatchConfirmation({}).ok, false);
  });
});
