import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CLUB_ROLES,
  READ_ONLY_ROLES,
  ROLE_SUMMARY,
  accountIdentity,
  candidateLabel,
  grantableRoles,
  isClubRole,
  linkableCandidates,
  revocation,
  type ClubAccount,
  type LinkCandidate,
} from './access-view.ts';

const account = (email: string, roles: string[], isSelf = false): ClubAccount => ({
  userId: email,
  email,
  roles,
  grantedAt: '2026-01-01T00:00:00Z',
  isSelf,
  personId: null,
  legalName: null,
  preferredName: null,
});

const linked = (
  email: string,
  personId: string,
  legalName: string,
  preferredName: string | null = null,
): ClubAccount => ({ ...account(email, ['registrar']), personId, legalName, preferredName });

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

test('accountIdentity', async (t) => {
  await t.test('prefers what the club actually calls somebody', () => {
    const who = accountIdentity(linked('g@t.test', 'p1', 'Grace Tupou', 'Gracie'));
    assert.equal(who.kind, 'linked');
    assert.equal(who.kind === 'linked' && who.display, 'Gracie');
    // Carried, not replaced — BR55 keeps the two apart everywhere else too.
    assert.equal(who.kind === 'linked' && who.legalName, 'Grace Tupou');
  });

  await t.test('falls back to the legal name when there is no preferred one', () => {
    const who = accountIdentity(linked('h@b.test', 'p2', 'Henry Bell'));
    assert.equal(who.kind === 'linked' && who.display, 'Henry Bell');
  });

  await t.test('treats a blank preferred name as absent, not as a name', () => {
    const who = accountIdentity(linked('h@b.test', 'p2', 'Henry Bell', '   '));
    assert.equal(who.kind === 'linked' && who.display, 'Henry Bell');
  });

  await t.test('says unlinked, and never substitutes the email address', () => {
    // BR108. The failure this guards is a screen that looks like it knows
    // who somebody is when nothing has ever said so.
    const who = accountIdentity(account('nobody@x.test', ['coach']));
    assert.equal(who.kind, 'unlinked');
    assert.equal(JSON.stringify(who).includes('nobody@x.test'), false);
  });
});

test('linkableCandidates', async (t) => {
  const people: LinkCandidate[] = [
    { personId: 'p1', legalName: 'Grace Tupou', preferredName: 'Gracie' },
    { personId: 'p2', legalName: 'Henry Bell', preferredName: null },
    { personId: 'p3', legalName: 'Ana Silva', preferredName: null },
  ];

  await t.test('hides a person another account has already claimed', () => {
    const accounts = [linked('g@t.test', 'p1', 'Grace Tupou'), account('x@x.test', ['coach'])];
    const offered = linkableCandidates(accounts[1]!, people, accounts);
    assert.deepEqual(offered.map((c) => c.personId), ['p2', 'p3']);
  });

  await t.test('keeps the account’s own person, so the control does not look amnesiac', () => {
    const self = linked('g@t.test', 'p1', 'Grace Tupou');
    const offered = linkableCandidates(self, people, [self]);
    assert.deepEqual(offered.map((c) => c.personId), ['p1', 'p2', 'p3']);
  });

  await t.test('offers everybody when nothing is linked yet', () => {
    const a = account('x@x.test', ['coach']);
    assert.equal(linkableCandidates(a, people, [a]).length, 3);
  });
});

test('candidateLabel', async (t) => {
  await t.test('shows both names when they differ', () => {
    assert.equal(
      candidateLabel({ personId: 'p', legalName: 'Grace Tupou', preferredName: 'Gracie' }),
      'Grace Tupou (Gracie)',
    );
  });

  await t.test('does not repeat a preferred name identical to the legal one', () => {
    assert.equal(
      candidateLabel({ personId: 'p', legalName: 'Ana Silva', preferredName: 'Ana Silva' }),
      'Ana Silva',
    );
  });
});
