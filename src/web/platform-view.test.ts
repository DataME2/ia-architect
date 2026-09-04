import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasDeputy, outstanding, parseProvision, type PlatformClub } from './platform-view.ts';

const form = (over: Record<string, unknown> = {}) => ({
  name: 'Example United FC',
  jurisdiction: 'AU-QLD',
  seasonName: '',
  seasonStarts: '',
  seasonEnds: '',
  primaryName: 'Dana Reyes',
  primaryEmail: 'dana@example.test',
  primaryPhone: '0400 111 222',
  secondaryName: '',
  secondaryEmail: '',
  secondaryPhone: '',
  ...over,
});

test('a club needs a name and a real jurisdiction', () => {
  assert.equal(parseProvision(form()).ok, true);
  assert.equal(parseProvision(form({ name: '  ' })).ok, false);
  assert.equal(parseProvision(form({ jurisdiction: 'AU-XYZ' })).ok, false);
});

test('a club needs somebody answerable for it', () => {
  // Required where the season is not: a tenant with nobody responsible is
  // how a club becomes nobody's problem.
  assert.equal(parseProvision(form({ primaryName: '', primaryEmail: '' })).ok, false);
  assert.equal(parseProvision(form({ primaryName: 'Dana Reyes', primaryEmail: '' })).ok, false);
  assert.equal(parseProvision(form({ primaryName: '', primaryEmail: 'd@x.test' })).ok, false);
});

test('the second person is optional, and half of one is refused', () => {
  assert.equal(parseProvision(form()).ok, true);
  assert.equal(parseProvision(form({ secondaryEmail: 'sam@example.test' })).ok, false);
  assert.equal(parseProvision(form({ secondaryName: 'Sam Ali' })).ok, false);
  assert.equal(
    parseProvision(form({ secondaryName: 'Sam Ali', secondaryEmail: 'sam@example.test' })).ok,
    true,
  );
});

test('the deputy cannot be the same person', () => {
  // The entire point is somebody reachable when the first is not.
  const parsed = parseProvision(
    form({ secondaryName: 'Dana Again', secondaryEmail: 'DANA@example.test' }),
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.ok ? '' : parsed.error, /somebody else/);
});

test('the demo marker is refused before the round trip', () => {
  const parsed = parseProvision(form({ name: 'Riverbend Rovers FC (DEMO)' }));
  assert.equal(parsed.ok, false);
  assert.match(parsed.ok ? '' : parsed.error, /seed\.sql/);
});

test('a season named must be a season dated, and cannot end before it starts', () => {
  assert.equal(parseProvision(form({ seasonName: '2027' })).ok, false);
  assert.equal(
    parseProvision(form({ seasonName: '2027', seasonStarts: '2027-12-01', seasonEnds: '2027-01-01' }))
      .ok,
    false,
  );
  assert.equal(
    parseProvision(form({ seasonName: '2027', seasonStarts: '2027-01-01', seasonEnds: '2027-12-01' }))
      .ok,
    true,
  );
});

test('a phone number is kept as given, and absence is null not empty', () => {
  const given = parseProvision(form({ primaryPhone: '  +61 400 111 222 ' }));
  assert.equal(given.ok && given.draft.primaryPhone, '+61 400 111 222');

  const none = parseProvision(form({ primaryPhone: '' }));
  assert.equal(none.ok, true);
  assert.equal(none.ok ? none.draft.primaryPhone : 'unreachable', null);
});

const contact = (claimed: boolean) => ({
  name: 'Dana Reyes',
  email: 'dana@example.test',
  phone: null,
  claimed,
});

const club = (over: Partial<PlatformClub> = {}): PlatformClub => ({
  clubId: 'c1',
  name: 'Example United FC',
  jurisdiction: 'AU-QLD',
  createdAt: '2026-09-04T00:00:00Z',
  adminCount: 1,
  seasonCount: 1,
  primary: contact(true),
  secondary: null,
  ...over,
});

test('an unclaimed invitation reads as waiting, not as missing', () => {
  // The club has been told and the person has not arrived. Chasing it would
  // be chasing something already in somebody's inbox.
  const gaps = outstanding(club({ primary: contact(false), adminCount: 0 }));
  assert.ok(gaps.some((g) => /waiting for dana@example\.test/.test(g)));
  assert.ok(!gaps.some((g) => /no responsible person/.test(g)));
});

test('no responsible person at all is a different thing from waiting', () => {
  const gaps = outstanding(club({ primary: null, adminCount: 0 }));
  assert.ok(gaps.some((g) => /no responsible person/.test(g)));
});

test('a fully arrived club reports nothing outstanding', () => {
  assert.deepEqual(outstanding(club()), []);
});

test('a club without a deputy is flagged as such', () => {
  assert.equal(hasDeputy(club()), false);
  assert.equal(hasDeputy(club({ secondary: contact(true) })), true);
});
