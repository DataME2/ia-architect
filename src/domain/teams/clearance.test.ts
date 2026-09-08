import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { bestClearance, expiringBeforeSeasonEnd, mayHoldRole } from './clearance.ts';
import type { Clearance } from './types.ts';

const SEASON_END = '2026-12-01';

function clearance(overrides: Partial<Clearance> = {}): Clearance {
  return {
    id: 'c-1',
    personId: 'p-1',
    kind: 'WWCC',
    identifier: 'BC-1234567',
    issuedOn: '2023-01-10',
    expiresOn: '2027-01-10',
    verifiedAt: '2026-01-15T00:00:00Z',
    revokedAt: null,
    filePath: null,
    ...overrides,
  };
}

describe('BR19 — no card, no start', () => {
  test('a cleared adult may coach', () => {
    const verdict = mayHoldRole('coach', [clearance()], SEASON_END);
    assert.equal(verdict.ok, true);
  });

  test('every official role is checked, not just coach', () => {
    for (const role of ['coach', 'assistant-coach', 'manager', 'team-official'] as const) {
      assert.equal(mayHoldRole(role, [], SEASON_END).ok, false, role);
    }
  });

  test('a player is never asked — a ten-year-old holds no Blue Card', () => {
    const verdict = mayHoldRole('player', [], SEASON_END);
    assert.equal(verdict.ok, true);
  });

  test('no clearance at all is refused, and says why in the club’s own words', () => {
    const verdict = mayHoldRole('coach', [], SEASON_END);
    assert.equal(verdict.ok, false);
    assert.ok(!verdict.ok && verdict.reason === 'none-held');
    assert.match(verdict.note, /No card, no start/);
  });

  test('a card number nobody checked is not a clearance', () => {
    // Holding a number is not verification. This is the difference between
    // "the parent told us" and "we looked".
    const verdict = mayHoldRole('coach', [clearance({ verifiedAt: null })], SEASON_END);
    assert.equal(verdict.ok, false);
    assert.ok(!verdict.ok && verdict.reason === 'unverified');
  });

  test('a revoked clearance is refused, and points at BR50', () => {
    const verdict = mayHoldRole(
      'manager',
      [clearance({ revokedAt: '2026-06-01T00:00:00Z' })],
      SEASON_END,
    );
    assert.equal(verdict.ok, false);
    assert.ok(!verdict.ok && verdict.reason === 'revoked');
    assert.match(verdict.note, /BR50/);
  });
});

describe('BR54 — measured against the end of the season', () => {
  test('a card expiring mid-season fails now, not in round 12', () => {
    const verdict = mayHoldRole(
      'coach',
      [clearance({ expiresOn: '2026-08-01' })],
      SEASON_END,
    );
    assert.equal(verdict.ok, false);
    assert.ok(!verdict.ok && verdict.reason === 'expires-in-season');
    assert.match(verdict.note, /2026-08-01/);
    assert.match(verdict.note, /2026-12-01/);
  });

  test('expiring exactly on the last day of the season is enough', () => {
    const verdict = mayHoldRole('coach', [clearance({ expiresOn: SEASON_END })], SEASON_END);
    assert.equal(verdict.ok, true);
  });

  test('a card valid today but not to season end still fails — that is the point', () => {
    // Under a naive "is it valid now" check this coach would pass.
    const verdict = mayHoldRole(
      'coach',
      [clearance({ expiresOn: '2026-09-30' })],
      SEASON_END,
    );
    assert.equal(verdict.ok, false);
  });
});

describe('choosing between several clearances', () => {
  test('the one covering furthest ahead wins, not the newest row', () => {
    // A renewal entered before the old card lapsed must not be beaten by
    // the old one just because it was recorded first.
    const best = bestClearance([
      clearance({ id: 'old', expiresOn: '2026-09-01' }),
      clearance({ id: 'new', expiresOn: '2029-09-01' }),
    ]);
    assert.equal(best?.id, 'new');
  });

  test('unusable ones are ignored when picking the best', () => {
    const best = bestClearance([
      clearance({ id: 'revoked', expiresOn: '2030-01-01', revokedAt: '2026-01-01T00:00:00Z' }),
      clearance({ id: 'unverified', expiresOn: '2031-01-01', verifiedAt: null }),
      clearance({ id: 'good', expiresOn: '2027-01-01' }),
    ]);
    assert.equal(best?.id, 'good');
  });

  test('a renewal rescues someone whose old card expires mid-season', () => {
    const verdict = mayHoldRole(
      'coach',
      [clearance({ id: 'old', expiresOn: '2026-08-01' }), clearance({ id: 'new' })],
      SEASON_END,
    );
    assert.equal(verdict.ok, true);
  });

  test('nothing usable is null', () => {
    assert.equal(bestClearance([]), null);
    assert.equal(bestClearance([clearance({ verifiedAt: null })]), null);
  });
});

describe('the list a coordinator chases in February', () => {
  test('names who runs out before the season does, soonest first', () => {
    const risky = expiringBeforeSeasonEnd(
      [
        { personId: 'safe', clearances: [clearance()] },
        { personId: 'june', clearances: [clearance({ expiresOn: '2026-06-01' })] },
        { personId: 'march', clearances: [clearance({ expiresOn: '2026-03-01' })] },
      ],
      SEASON_END,
    );
    assert.deepEqual(
      risky.map((r) => r.personId),
      ['march', 'june'],
    );
  });

  test('someone with no usable clearance is not listed here', () => {
    // They are blocked outright by BR19; this list is about cards that
    // exist and will lapse, which is a different conversation.
    const risky = expiringBeforeSeasonEnd(
      [{ personId: 'nobody', clearances: [] }],
      SEASON_END,
    );
    assert.deepEqual(risky, []);
  });
});
