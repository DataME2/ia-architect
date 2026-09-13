import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { describeFixtureChange, type FixtureState } from './fixture-change.ts';

const at = (over: Partial<FixtureState> = {}): FixtureState => ({
  kickOff: '10:00', venue: 'North Star Park', status: 'scheduled', ...over,
});

describe('describeFixtureChange — BR64', () => {
  it('says nothing when nothing moved', () => {
    // A message announcing that nothing changed teaches people to stop
    // reading the ones that matter.
    assert.equal(describeFixtureChange(at(), at()), null);
  });

  it('leads with a cancellation', () => {
    const words = describeFixtureChange(at(), at({ status: 'cancelled', venue: 'Elsewhere' }));
    assert.match(words ?? '', /^it has been cancelled/);
  });

  it('reports a new kick-off and a new venue together', () => {
    const words = describeFixtureChange(at(), at({ kickOff: '14:30', venue: 'Coast Reserve' }));
    assert.equal(words, 'the kick-off is now 14:30 and the venue is now Coast Reserve');
  });

  it('reports a removal as a removal, not as a blank', () => {
    assert.equal(describeFixtureChange(at(), at({ venue: null })), 'the venue has been removed');
  });

  it('joins three changes readably', () => {
    const words = describeFixtureChange(at(), at({ status: 'abandoned', kickOff: '09:00', venue: 'X' }));
    assert.match(words ?? '', /, .* and /);
  });
});
