import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NEW_MATCH, advance, clockLabel, elapsed, onPitch, place, trackedGameTime } from './match-tracker.ts';

const MIN = 60_000;

describe('the match tracker', () => {
  it('counts minutes by position, never the half-time break', () => {
    const t0 = 1_000_000;
    let s = NEW_MATCH;
    s = place(s, 'a', 'midfielder', t0);
    s = place(s, 'a', 'defender', t0); // changed before kick-off: nothing lost
    s = place(s, 'a', 'midfielder', t0);
    s = advance(s, t0); // kick off
    s = place(s, 'a', 'forward', t0 + 30 * MIN);
    s = advance(s, t0 + 45 * MIN); // half time
    assert.equal(elapsed(s, t0 + 55 * MIN), 45 * 60);
    s = advance(s, t0 + 60 * MIN); // second half, after a 15-minute break
    s = place(s, 'a', null, t0 + 75 * MIN); // off at 60:00 of play
    s = place(s, 'b', 'defender', t0 + 75 * MIN); // on at 60:00
    assert.deepEqual([...onPitch(s)], [['b', 'defender']]);
    s = advance(s, t0 + 105 * MIN); // full time at 90:00
    assert.equal(s.phase, 'full-time');
    assert.deepEqual(onPitch(s).size, 0);

    assert.deepEqual(trackedGameTime(s, t0 + 200 * MIN), [
      { personId: 'a', started: true, positions: { midfielder: 30, forward: 30 } },
      { personId: 'b', started: false, positions: { defender: 30 } },
    ]);
  });

  it('changes nothing after full time', () => {
    let s = advance(advance(advance(advance(NEW_MATCH, 0), MIN), MIN), 2 * MIN);
    assert.equal(s.phase, 'full-time');
    s = place(s, 'a', 'goalkeeper', 3 * MIN);
    assert.equal(s.stints.length, 0);
    assert.equal(advance(s, 4 * MIN), s);
  });

  it('reads the clock as the bench does', () => {
    assert.equal(clockLabel(0), '0:00');
    assert.equal(clockLabel(37 * 60 + 5), '37:05');
  });
});
