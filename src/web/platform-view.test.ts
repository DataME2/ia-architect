import assert from 'node:assert/strict';
import { test } from 'node:test';

import { outstanding, parseProvision, type PlatformClub } from './platform-view.ts';

const form = (over: Record<string, unknown> = {}) => ({
  name: 'Example United FC',
  jurisdiction: 'AU-QLD',
  adminEmail: '',
  seasonName: '',
  seasonStarts: '',
  seasonEnds: '',
  ...over,
});

test('a club needs a name and a real jurisdiction', () => {
  assert.equal(parseProvision(form()).ok, true);
  assert.equal(parseProvision(form({ name: '  ' })).ok, false);
  assert.equal(parseProvision(form({ jurisdiction: '' })).ok, false);
  assert.equal(parseProvision(form({ jurisdiction: 'AU-XYZ' })).ok, false);
});

test('the demo marker is refused before the round trip, as well as in the database', () => {
  const parsed = parseProvision(form({ name: 'Riverbend Rovers FC (DEMO)' }));
  assert.equal(parsed.ok, false);
  assert.match(parsed.ok ? '' : parsed.error, /seed\.sql/);
});

test('an administrator and a season are both optional', () => {
  const parsed = parseProvision(form());
  assert.equal(parsed.ok && parsed.draft.adminEmail, null);
  assert.equal(parsed.ok && parsed.draft.seasonName, null);
});

test('a season named must be a season dated', () => {
  assert.equal(parseProvision(form({ seasonName: '2027' })).ok, false);
  assert.equal(
    parseProvision(form({ seasonName: '2027', seasonStarts: '2027-01-01', seasonEnds: '2027-12-01' }))
      .ok,
    true,
  );
});

test('a season cannot end before it starts', () => {
  const parsed = parseProvision(
    form({ seasonName: '2027', seasonStarts: '2027-12-01', seasonEnds: '2027-01-01' }),
  );
  assert.equal(parsed.ok, false);
  assert.match(parsed.ok ? '' : parsed.error, /ends before it starts/);
});

const club = (over: Partial<PlatformClub> = {}): PlatformClub => ({
  clubId: 'c1',
  name: 'Example United FC',
  jurisdiction: 'AU-QLD',
  createdAt: '2026-09-04T00:00:00Z',
  adminCount: 1,
  seasonCount: 1,
  ...over,
});

test('a half-provisioned club says what it still needs', () => {
  assert.deepEqual(outstanding(club()), []);
  assert.match(outstanding(club({ adminCount: 0 }))[0] ?? '', /nobody can sign in/);
  assert.match(outstanding(club({ seasonCount: 0 }))[0] ?? '', /registrations cannot be created/);
  assert.equal(outstanding(club({ adminCount: 0, seasonCount: 0 })).length, 2);
});
