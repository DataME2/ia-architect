import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  STUDY_ARC,
  arcPath,
  arcPoint,
  clamp01,
  enterProgress,
  passProgress,
  percent,
  runwayProgress,
  stationAt,
  stationT,
} from './home-motion.ts';

describe('the front door in motion (scope 120)', () => {
  it('keeps every progress between 0 and 1, even for nonsense', () => {
    assert.equal(clamp01(-3), 0);
    assert.equal(clamp01(0.4), 0.4);
    assert.equal(clamp01(7), 1);
    assert.equal(clamp01(Number.NaN), 0);
  });

  it('runs a pinned section from its top reaching the bar to the runway’s end, and back', () => {
    // A 3,000px section with a 900px stage under a 60px bar: 2,100px of runway.
    assert.equal(runwayProgress(500, 3000, 900, 60), 0);
    assert.equal(runwayProgress(60, 3000, 900, 60), 0);
    assert.equal(runwayProgress(60 - 1050, 3000, 900, 60), 0.5);
    assert.equal(runwayProgress(60 - 2100, 3000, 900, 60), 1);
    assert.equal(runwayProgress(-9000, 3000, 900, 60), 1);
    // No runway (a phone, where nothing pins) means no progress.
    assert.equal(runwayProgress(-200, 900, 900, 60), 0);
  });

  it('measures a section scrolling away where nothing pins it', () => {
    assert.equal(passProgress(60, 700, 60), 0);
    assert.equal(passProgress(-290, 700, 60), 0.5);
    assert.equal(passProgress(-2000, 700, 60), 1);
    assert.equal(passProgress(-2000, 0, 60), 0);
  });

  it('measures an element rising into view', () => {
    assert.equal(enterProgress(1000, 300, 800), 0);
    assert.equal(enterProgress(650, 300, 800), 0.5);
    assert.equal(enterProgress(100, 300, 800), 1);
    assert.equal(enterProgress(100, 0, 800), 0);
  });

  it('puts eight stations evenly along the path, and finds the nearest', () => {
    assert.deepEqual(
      Array.from({ length: 8 }, (_, i) => stationT(i, 8)),
      [0, 1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7, 1],
    );
    for (let i = 0; i < 8; i++) assert.equal(stationAt(stationT(i, 8), 8), i);
    assert.equal(stationAt(0.06, 8), 0);
    assert.equal(stationAt(0.08, 8), 1);
    assert.equal(stationAt(2, 8), 7);
    assert.equal(stationT(0, 1), 0);
  });

  it('draws the arc from its first station to its last, and keeps every point on it', () => {
    const a = arcPoint(STUDY_ARC, 0);
    const b = arcPoint(STUDY_ARC, 1);
    assert.match(arcPath(STUDY_ARC), new RegExp(`^M ${a.x} ${a.y} A 250 250 0 0 1 ${b.x} ${b.y}$`));
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = arcPoint(STUDY_ARC, t);
      const d = Math.hypot(p.x - STUDY_ARC.cx, p.y - STUDY_ARC.cy);
      assert.ok(Math.abs(d - STUDY_ARC.r) < 0.02, `t=${t} is ${d} from the centre`);
      // Inside the 640 by 440 drawing, above the person.
      assert.ok(p.x > 0 && p.x < 640 && p.y > 0 && p.y < STUDY_ARC.cy, `t=${t} at ${p.x},${p.y}`);
    }
    // Halfway along is straight above the person.
    assert.equal(arcPoint(STUDY_ARC, 0.5).x, STUDY_ARC.cx);
  });

  it('reads a progress as a whole percentage', () => {
    assert.equal(percent(0), 0);
    assert.equal(percent(3 / 7), 43);
    assert.equal(percent(1), 100);
  });
});
