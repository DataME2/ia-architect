import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CLUB_ROLES,
  READ_ONLY_ROLES,
  ROLE_SUMMARY,
  grantableRoles,
  isClubRole,
  revocation,
  type ClubAccount,
} from './access-view.ts';

const account = (email: string, roles: string[], isSelf = false): ClubAccount => ({
  userId: email,
  email,
  roles,
  grantedAt: '2026-01-01T00:00:00Z',
  isSelf,
});

test('the last administrator cannot be removed', () => {
  const only = account('a@x.test', ['admin', 'registrar'], true);
  const others = [only, account('b@x.test', ['registrar'])];

  const r = revocation(only, 'admin', others);
  assert.equal(r.allowed, false);
  assert.match(r.allowed ? '' : r.reason, /only administrator/i);
});

test('a second administrator makes the first removable', () => {
  const a = account('a@x.test', ['admin'], true);
  const b = account('b@x.test', ['admin']);
  assert.equal(revocation(a, 'admin', [a, b]).allowed, true);
});

test('the lockout guard is about admin and nothing else', () => {
  const only = account('a@x.test', ['admin', 'registrar'], true);
  // Removing the only registrar is inconvenient, not irreversible: an admin
  // can grant it back. Only admin is the trapdoor.
  assert.equal(revocation(only, 'registrar', [only]).allowed, true);
});

test('the message says whose access it is', () => {
  const self = account('a@x.test', ['admin'], true);
  const other = account('b@x.test', ['admin']);
  const mine = revocation(self, 'admin', [self]);
  const theirs = revocation(other, 'admin', [other]);
  assert.match(mine.allowed ? '' : mine.reason, /You are/);
  assert.match(theirs.allowed ? '' : theirs.reason, /This is/);
});

test('a role already held is not offered again', () => {
  const a = account('a@x.test', ['admin', 'coach']);
  const offered = grantableRoles(a);
  assert.ok(!offered.includes('admin'));
  assert.ok(!offered.includes('coach'));
  assert.ok(offered.includes('treasurer'));
});

test('viewer is not a club role', () => {
  // It is the demonstration club's read-only role (BR91). Granting it to
  // staff would give it a second meaning.
  assert.equal(isClubRole('viewer'), false);
  assert.equal(isClubRole('admin'), true);
  assert.equal(isClubRole(''), false);
});

test('every role has a summary, and the read-only ones say so', () => {
  for (const role of CLUB_ROLES) {
    assert.ok(ROLE_SUMMARY[role].length > 0, role);
  }
  for (const role of READ_ONLY_ROLES) {
    assert.match(ROLE_SUMMARY[role], /Writes nothing/);
  }
});
