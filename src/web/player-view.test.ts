import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PlayerProfile, SeasonRecord } from '../domain/performance/types.ts';
import {
  hasPhysique,
  heightLabel,
  ineligibleAppearances,
  recordSummary,
  weightLabel,
} from './player-view.ts';

const profile = (over: Partial<PlayerProfile> = {}): PlayerProfile => ({
  heightCm: null,
  weightKg: null,
  preferredPosition: null,
  secondaryPosition: null,
  preferredFoot: null,
  squadNumber: null,
  recordedOn: '2026-03-01',
  ...over,
});

const record = (over: Partial<SeasonRecord> = {}): SeasonRecord => ({
  appearances: 0,
  starts: 0,
  substituteAppearances: 0,
  minutesPlayed: 0,
  goals: 0,
  assists: 0,
  goalContributions: 0,
  ...over,
});

test('absent physique reads as absent, not as zero', () => {
  // Physique is optional by design, so "not recorded" is the common case
  // and must never render as a measurement.
  assert.equal(heightLabel(null), null);
  assert.equal(weightLabel(null), null);
  assert.equal(heightLabel(142), '142 cm');
});

test('weight is not given a precision nobody measured', () => {
  assert.equal(weightLabel(42), '42 kg');
  assert.equal(weightLabel(42.5), '42.5 kg');
  assert.equal(weightLabel(42.04), '42 kg');
});

test('a profile with nothing in it earns no panel', () => {
  assert.equal(hasPhysique(null), false);
  assert.equal(hasPhysique(profile()), false);
  assert.equal(hasPhysique(profile({ squadNumber: 9 })), true);
  assert.equal(hasPhysique(profile({ preferredPosition: 'forward' })), true);
});

test('no appearances says so, rather than showing a row of zeroes', () => {
  assert.match(recordSummary(record()), /No appearances recorded/);
});

test('a season with no goals is not described as a failure', () => {
  const line = recordSummary(record({ appearances: 3, minutesPlayed: 120 }));
  assert.equal(line, '3 appearances, 120 minutes.');
  assert.ok(!line.includes('0 goal'));
});

test('singular and plural are both handled', () => {
  assert.match(recordSummary(record({ appearances: 1, minutesPlayed: 1 })), /1 appearance, 1 minute\./);
});

test('goals and assists appear once there are any', () => {
  const line = recordSummary(
    record({ appearances: 5, minutesPlayed: 300, goals: 2, assists: 1, goalContributions: 3 }),
  );
  assert.match(line, /2 goals and 1 assist/);
});

test('an ineligible appearance is flagged, and only when one happened', () => {
  // BR103: the flag exists so somebody can act on it afterwards. With no
  // appearances there is nothing to act on, however ineligible the player.
  assert.deepEqual(
    ineligibleAppearances({ appearances: 0, outstandingCents: 5000, federationConfirmed: false }),
    [],
  );

  const owing = ineligibleAppearances({
    appearances: 2,
    outstandingCents: 5000,
    federationConfirmed: true,
  });
  assert.equal(owing.length, 1);
  assert.match(owing[0]?.reason ?? '', /BR79/);
});

test('both breaches are reported, not just the first', () => {
  const both = ineligibleAppearances({
    appearances: 1,
    outstandingCents: 100,
    federationConfirmed: false,
  });
  assert.equal(both.length, 2);
});

test('an eligible player with appearances is flagged for nothing', () => {
  assert.deepEqual(
    ineligibleAppearances({ appearances: 9, outstandingCents: 0, federationConfirmed: true }),
    [],
  );
});
