/**
 * BR5's cost, asserted — NFR-16.
 *
 * This is the only test in the suite that measures rather than decides, and
 * it is here because the failure it catches is invisible in every other
 * one. Duplicate detection compares people against people, so a fixture of
 * twenty rows exercises four hundred comparisons and a season of seven
 * hundred registrations exercises two million. The rule is identical in
 * both; only the club notices.
 *
 * **It asserts the shape of the curve, not a number of milliseconds.** A
 * wall-clock ceiling on a shared CI runner fails on a noisy neighbour and
 * teaches the team to re-run it, which is worse than not having it — the
 * assertion below survives a machine four times slower because doubling the
 * input is compared against the same run, not against a constant.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { person } from '../test-fixtures.ts';
import type { Person } from '../types.ts';
import { findDuplicatePairs } from './br5-duplicate-candidates.ts';

/**
 * A club that looks like a real one: many distinct birthdays, names that
 * repeat, and a fifth of records with no email.
 *
 * The distribution matters more than the size. Everybody born on the same
 * day would be one bucket and quadratic again — which is the honest limit
 * of the index, and a club of children spread across a decade is nowhere
 * near it.
 */
function club(size: number): Person[] {
  const people: Person[] = [];
  for (let i = 0; i < size; i += 1) {
    const date = new Date(Date.UTC(2010, 0, 1 + (i % 3650))).toISOString().slice(0, 10);
    people.push(
      person({
        id: `person-${i}`,
        legalName: { givenNames: `Given${i % 400}`, familyName: `Family${i % 300}` },
        dateOfBirth: date,
        email: i % 5 === 0 ? null : `person${i}@example.test`,
      }),
    );
  }
  return people;
}

/**
 * The **fastest** of several runs, not the average.
 *
 * `node --test` runs files in parallel and a CI runner is shared, so any
 * single measurement can be inflated by work that has nothing to do with
 * this function. Noise only ever adds time, never removes it, so the
 * minimum is the closest estimate of the real cost available without a
 * quiet machine — and using the average here made this test fail in a full
 * suite run while passing on its own, which is the worst possible outcome
 * for a performance gate.
 */
function millisFor(size: number): number {
  const people = club(size);
  let best = Infinity;
  for (let run = 0; run < 7; run += 1) {
    const started = performance.now();
    findDuplicatePairs(people);
    best = Math.min(best, performance.now() - started);
  }
  return best;
}

describe('BR5 — cost at a season’s scale (NFR-16)', () => {
  it('does not grow quadratically as the club doubles', () => {
    const small = millisFor(700);
    const large = millisFor(1400);

    // Quadratic would be ~4×. Linear is ~2×. The ceiling is deliberately
    // slack: it is there to catch a return to comparing everybody with
    // everybody, not to police a constant factor.
    const ratio = large / Math.max(small, 0.05);
    assert.ok(
      ratio < 3,
      `doubling the club multiplied the work by ${ratio.toFixed(1)}× ` +
        `(${small.toFixed(1)}ms → ${large.toFixed(1)}ms). Under 3× is the budget; ` +
        'around 4× means the date-of-birth index has stopped being used.',
    );
  });

  it('finds the same pairs however the people are ordered', () => {
    const people = club(400);
    const forwards = findDuplicatePairs(people);
    const backwards = findDuplicatePairs([...people].reverse());

    const key = (p: { aId: string; bId: string }) => `${p.aId}:${p.bId}`;
    assert.deepEqual(
      [...forwards.map(key)].sort(),
      [...backwards.map(key)].sort(),
      'the index changed which pairs are found, which would make it a heuristic',
    );
  });
});
