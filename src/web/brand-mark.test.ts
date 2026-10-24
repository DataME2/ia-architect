import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BALL_FADE,
  KEY_POINTS,
  KEY_SPLINES,
  KEY_TIMES,
  MOVE_PATH,
  MOVE_SECONDS,
  NET_FLASH,
  SPIN_DEGREES,
} from './brand-mark.ts';

const rising = (xs: readonly number[]) => xs.every((x, i) => i === 0 || x >= xs[i - 1]!);

test('the move’s lists agree, or SMIL would drop it without a word', () => {
  assert.equal(KEY_POINTS.length, KEY_TIMES.length);
  assert.equal(SPIN_DEGREES.length, KEY_TIMES.length);
  assert.equal(KEY_SPLINES.length, KEY_TIMES.length - 1);
  assert.equal(BALL_FADE.values.length, BALL_FADE.keyTimes.length);
  assert.equal(NET_FLASH.values.length, NET_FLASH.keyTimes.length);
  // A timeline that does not run from 0 to 1 is dropped too: the net's
  // first draft ended at 0.86 and never lit.
  for (const times of [KEY_TIMES, BALL_FADE.keyTimes, NET_FLASH.keyTimes]) {
    assert.equal(times[0], 0);
    assert.equal(times.at(-1), 1);
    assert.ok(rising(times));
  }
  assert.ok(rising(KEY_POINTS) && KEY_POINTS[0] === 0 && KEY_POINTS.at(-1) === 1);
});

test('the still mark is a ball at kick-off: on the spot, upright, visible', () => {
  assert.ok(MOVE_PATH.startsWith('M0 0') && MOVE_PATH.endsWith('L0 0'));
  assert.equal(SPIN_DEGREES.at(-1)! % 360, 0);
  assert.equal(BALL_FADE.values.at(-1), 1);
  assert.equal(NET_FLASH.values.at(-1), 0);
});

test('each touch is where the path says, and the move is under five seconds', () => {
  // 7.1, 10.5, 13.3 and 17.3 units, then 12.2 back to the spot.
  assert.deepEqual(KEY_POINTS.slice(1, 5), [0.1177, 0.2916, 0.5117, 0.798]);
  assert.ok(MOVE_SECONDS < 5);
});
