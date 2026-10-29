import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clamp01,
  enterProgress,
  indexPosition,
  pageReveal,
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

  it('puts the marker on the index row it names, and never outside the index', () => {
    assert.equal(indexPosition(0, 8), 0.5 / 8);
    assert.equal(indexPosition(1, 8), 7.5 / 8);
    for (let i = 0; i < 8; i++) assert.equal(indexPosition(stationT(i, 8), 8), (i + 0.5) / 8);
    assert.equal(indexPosition(-1, 8), 0.5 / 8);
    assert.equal(indexPosition(9, 8), 7.5 / 8);
  });

  it('wipes each page in around the point where its station takes over', () => {
    const n = 8;
    for (const p of [0, 0.2, 0.5, 0.9, 1]) assert.equal(pageReveal(p, 0, n), 1);
    // Page 3's station takes over at 2.5 pages of progress: mid-wipe there.
    const at = (pages: number) => pages / (n - 1);
    assert.equal(pageReveal(at(2.5), 3, n), 0.5);
    assert.equal(pageReveal(at(2.3), 3, n), 0);
    assert.equal(pageReveal(at(2.7), 3, n), 1);
    assert.equal(stationAt(at(2.5), n), 3);
    // Holding still on a station: that page shown, the next not yet begun.
    assert.equal(pageReveal(at(3), 3, n), 1);
    assert.equal(pageReveal(at(3), 4, n), 0);
    // Scrolling back reverses it.
    assert.equal(pageReveal(at(2), 3, n), 0);
  });

  it('reads a progress as a whole percentage', () => {
    assert.equal(percent(0), 0);
    assert.equal(percent(3 / 7), 43);
    assert.equal(percent(1), 100);
  });
});
