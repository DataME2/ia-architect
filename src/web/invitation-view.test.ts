import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  clampExpiryDays,
  DEFAULT_EXPIRY_DAYS,
  expiryFrom,
  hashToken,
  invitationLink,
  invitationStatus,
} from './invitation-view.ts';

describe('hashToken', () => {
  test('matches the hash Postgres computes for the same string', () => {
    // Pinned on both sides. supabase/tests/12_public_registration.sql
    // asserts the identical constant for 'live-token'. If these ever drift,
    // every issued link stops working silently rather than loudly — the
    // token is hashed here at issue and there at redemption.
    assert.equal(
      hashToken('live-token'),
      '6d2fec1ec213cfadabafaccdf0b6e3855f90107af42f243b241546092c00f455',
    );
  });

  test('is stable and case-sensitive', () => {
    assert.equal(hashToken('abc'), hashToken('abc'));
    assert.notEqual(hashToken('abc'), hashToken('ABC'));
  });

  test('handles a non-ASCII token without throwing', () => {
    assert.match(hashToken('tökén'), /^[0-9a-f]{64}$/);
  });
});

describe('invitationStatus', () => {
  const now = new Date('2026-08-19T00:00:00Z');

  test('is live before the expiry', () => {
    assert.equal(
      invitationStatus({ expiresAt: '2026-09-19T00:00:00Z', revokedAt: null }, now),
      'live',
    );
  });

  test('is expired on and after the expiry instant', () => {
    assert.equal(
      invitationStatus({ expiresAt: '2026-08-19T00:00:00Z', revokedAt: null }, now),
      'expired',
    );
    assert.equal(
      invitationStatus({ expiresAt: '2026-08-18T23:59:59Z', revokedAt: null }, now),
      'expired',
    );
  });

  test('reports revocation even once the link has also lapsed', () => {
    // Revoking is a deliberate act. Describing it as "expired" afterwards
    // would tell the registrar something untrue about what happened.
    assert.equal(
      invitationStatus({ expiresAt: '2026-01-01T00:00:00Z', revokedAt: '2025-12-01T00:00:00Z' }, now),
      'revoked',
    );
  });

  test('reports revocation on a link that would otherwise be live', () => {
    assert.equal(
      invitationStatus({ expiresAt: '2026-12-01T00:00:00Z', revokedAt: '2026-08-01T00:00:00Z' }, now),
      'revoked',
    );
  });
});

describe('invitationLink', () => {
  test('builds a link under the given origin', () => {
    assert.equal(
      invitationLink('https://club.example', 'abc123'),
      'https://club.example/join/abc123',
    );
  });

  test('does not double the slash when the origin has a trailing one', () => {
    assert.equal(
      invitationLink('https://club.example/', 'abc123'),
      'https://club.example/join/abc123',
    );
  });

  test('escapes a token so it cannot alter the path', () => {
    assert.equal(
      invitationLink('https://club.example', 'a/b?c=d'),
      'https://club.example/join/a%2Fb%3Fc%3Dd',
    );
  });
});

describe('clampExpiryDays', () => {
  test('keeps a sensible request', () => {
    assert.equal(clampExpiryDays(30), 30);
  });

  test('refuses an unbounded lifetime', () => {
    // BR73: a registration link outlives its season in a group chat, and
    // every extra month is time a leaked link still writes into the club.
    assert.equal(clampExpiryDays(100000), 365);
  });

  test('refuses a zero or negative lifetime', () => {
    assert.equal(clampExpiryDays(0), 1);
    assert.equal(clampExpiryDays(-5), 1);
  });

  test('falls back on a non-number', () => {
    assert.equal(clampExpiryDays(Number.NaN), DEFAULT_EXPIRY_DAYS);
    assert.equal(clampExpiryDays(Number.POSITIVE_INFINITY), DEFAULT_EXPIRY_DAYS);
  });
});

describe('expiryFrom', () => {
  test('adds the requested days', () => {
    assert.equal(expiryFrom(new Date('2026-08-19T00:00:00Z'), 30), '2026-09-18T00:00:00.000Z');
  });

  test('crosses a year boundary correctly', () => {
    assert.equal(expiryFrom(new Date('2026-12-20T00:00:00Z'), 30), '2027-01-19T00:00:00.000Z');
  });

  test('clamps rather than trusting the caller', () => {
    assert.equal(expiryFrom(new Date('2026-08-19T00:00:00Z'), 99999).slice(0, 4), '2027');
  });
});
