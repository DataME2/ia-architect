import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DEFAULT_SIBLING_DISCOUNT_BPS,
  ageThisSeason,
  defaultLine,
  fillTerms,
  linesFor,
  placeholdersIn,
  priceRegistration,
  siblingPlace,
  type FeeLine,
} from './registration-price.ts';

const line = (
  id: string,
  kind: FeeLine['kind'],
  amountCents: number,
  minAge: number | null,
  maxAge: number | null,
  depositCents: number | null = null,
  standard = false,
): FeeLine => ({ id, kind, name: id, amountCents, depositCents, minAge, maxAge, adminOnly: true, standard });

// After the pilot club's schedule.
// Ages are the age a player turns this season: an Under 12 turns eleven.
const LINES = [
  line('MiniRoos U8 to U12', 'club', 53000, 7, 11, null, true),
  line('Advanced U9', 'club', 120000, 8, 8, 30000),
  line('FQ MiniRoos (U8–U11)', 'governing', 5000, 7, 10, null, true),
  line('FQ Juniors (U12–U18)', 'governing', 6600, 11, 17, null, true),
  line('Volunteer levy', 'levy', 5000, null, null),
];

test('the first player pays the club line, the governing fee and the levy in full', () => {
  const p = priceRegistration({ clubLine: LINES[0]!, lines: LINES, age: 9, siblingIndex: 0, discountBps: DEFAULT_SIBLING_DISCOUNT_BPS });
  assert.deepEqual(p.lines.map((l) => l.cents), [53000, 5000, 5000]);
  assert.equal(p.discountCents, 0);
  assert.equal(p.totalCents, 63000);
});

test('a later sibling gets 15% off the club line only, never the governing fee or the levy', () => {
  const p = priceRegistration({ clubLine: LINES[0]!, lines: LINES, age: 11, siblingIndex: 1, discountBps: DEFAULT_SIBLING_DISCOUNT_BPS });
  assert.equal(p.discountCents, 7950); // 15% of $530, not of $530 + $66 + $50
  assert.equal(p.totalCents, 53000 + 6600 + 5000 - 7950);
});

test('every sibling after the first gets it, at the club\'s own percentage', () => {
  const third = priceRegistration({ clubLine: LINES[1]!, lines: LINES, age: 8, siblingIndex: 2, discountBps: 1000 });
  assert.equal(third.discountCents, 12000);
  assert.equal(third.depositCents, 30000);
});

test('the governing fee follows the age, and a line without ages fits everyone', () => {
  assert.deepEqual(linesFor(LINES, 'governing', 11).map((l) => l.id), ['FQ Juniors (U12–U18)']);
  assert.deepEqual(linesFor(LINES, 'levy', 40).map((l) => l.id), ['Volunteer levy']);
  assert.deepEqual(linesFor(LINES, 'club', 15), []);
});

test('a club with no club line still charges what it has, with nothing to discount', () => {
  const p = priceRegistration({ clubLine: null, lines: LINES, age: 9, siblingIndex: 3, discountBps: 1500 });
  assert.equal(p.discountCents, 0);
  assert.equal(p.totalCents, 10000);
});

test('the sibling order is by when each registration was opened', () => {
  const openings = ['2026-11-01T09:00:00Z', '2026-11-01T09:05:00Z', '2026-11-02T10:00:00Z'];
  assert.equal(siblingPlace('2026-11-01T09:00:00Z', openings), 0);
  assert.equal(siblingPlace('2026-11-02T10:00:00Z', openings), 2);
});

test('terms are filled from the club\'s values, and an unknown placeholder stays as typed', () => {
  const t = 'By registering with {club} you accept its Codes of Conduct. Ask {club_email}. Plans close {date_in_future}.';
  assert.deepEqual(placeholdersIn(t), ['club', 'club_email', 'date_in_future']);
  assert.equal(
    fillTerms(t, { club: 'North Star FC', club_email: 'secretary@northstarfc.example' }),
    'By registering with North Star FC you accept its Codes of Conduct. Ask secretary@northstarfc.example. Plans close {date_in_future}.',
  );
});

test('without a team, the standard line is charged before a cheaper or a dearer one', () => {
  // An eight-year-old fits both; Advanced is only ever charged through its team.
  assert.equal(defaultLine(LINES, 'club', 8)?.id, 'MiniRoos U8 to U12');
  const academy = line('Academy (9–18)', 'club', 100000, 9, 18);
  const cheap = line('Squad (0)', 'club', 0, 9, 11);
  assert.equal(defaultLine([...LINES, academy, cheap], 'club', 10)?.id, 'MiniRoos U8 to U12');
  // With no standard line for the age, the cheapest that fits.
  assert.equal(defaultLine([academy, cheap], 'club', 10)?.id, 'Squad (0)');
  assert.equal(defaultLine(LINES, 'club', 30), null);
});

test("a player's age is the age they turn in the season's year", () => {
  assert.equal(ageThisSeason('2018-11-30', '2026-01-01'), 8); // an Under 9
  assert.equal(ageThisSeason('2009-02-01', '2026-03-23'), 17);
});
