import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guardian, person, TODAY } from '../domain/test-fixtures.ts';
import type { PersonRole } from '../domain/types.ts';
import {
  buildDirectory,
  parseDocumentChecklist,
  parseSeasonRole,
  roleCounts,
  searchDirectory,
  UNKNOWN_DATE_OF_BIRTH,
  withoutRole,
} from './people-view.ts';

const SEASON = 'season-2026';

function role(personId: string, name: PersonRole['role']): PersonRole {
  return { personId, seasonId: SEASON, role: name };
}

const child = person({ id: 'p-child' });
const parent = person({
  id: 'p-parent',
  legalName: { givenNames: 'Mai', familyName: 'Nguyen' },
  preferredName: null,
  dateOfBirth: UNKNOWN_DATE_OF_BIRTH,
  email: 'mai@example.test',
  legalNameVerifiedAt: null,
});
const link = guardian({ personId: 'p-child', guardianPersonId: 'p-parent' });

test('one Person holding two roles is one row, not two (P1)', () => {
  const directory = buildDirectory(
    [parent],
    [role('p-parent', 'guardian'), role('p-parent', 'coach')],
    [],
    TODAY,
  );
  assert.equal(directory.length, 1);
  assert.deepEqual(directory[0]?.roles, ['coach', 'guardian']);
});

test('roles come back in a fixed order, whatever order the rows arrive in', () => {
  const forwards = buildDirectory(
    [parent],
    [role('p-parent', 'guardian'), role('p-parent', 'player')],
    [],
    TODAY,
  );
  const backwards = buildDirectory(
    [parent],
    [role('p-parent', 'player'), role('p-parent', 'guardian')],
    [],
    TODAY,
  );
  assert.deepEqual(forwards[0]?.roles, backwards[0]?.roles);
  assert.deepEqual(forwards[0]?.roles, ['player', 'guardian']);
});

test('a guardian relationship reads from both ends', () => {
  const directory = buildDirectory([child, parent], [], [link], TODAY);
  const childRow = directory.find((s) => s.personId === 'p-child');
  const parentRow = directory.find((s) => s.personId === 'p-parent');

  assert.deepEqual(childRow?.guardianNames, ['Mai Nguyen']);
  assert.deepEqual(childRow?.dependantNames, []);
  assert.deepEqual(parentRow?.dependantNames, ['Alex Nguyen']);
  assert.deepEqual(parentRow?.guardianNames, []);
});

test('the placeholder date of birth reports an unknown age, not 126', () => {
  const directory = buildDirectory([parent], [], [], TODAY);
  assert.equal(directory[0]?.age, null);
});

test('a real date of birth still gives an age', () => {
  const directory = buildDirectory([child], [], [], TODAY);
  assert.equal(directory[0]?.age, 12);
});

test('sorted by legal name, so two same-named children land next to each other', () => {
  const twinA = person({ id: 'p-a', dateOfBirth: '2014-03-02' });
  const twinB = person({ id: 'p-b', dateOfBirth: '2013-01-01' });
  const other = person({
    id: 'p-c',
    legalName: { givenNames: 'Ben', familyName: 'Alvarez' },
  });

  const directory = buildDirectory([twinA, other, twinB], [], [], TODAY);
  assert.deepEqual(
    directory.map((s) => s.personId),
    ['p-c', 'p-b', 'p-a'],
    'Alvarez sorts before Nguyen, and the two Nguyens sort by date of birth',
  );
});

test('search matches the legal name, which may be the name not on screen', () => {
  const directory = buildDirectory([child], [], [], TODAY);
  assert.equal(directory[0]?.displayName, 'Alex Nguyen');

  assert.equal(searchDirectory(directory, 'Alexandra').length, 1);
  assert.equal(searchDirectory(directory, 'Alex').length, 1);
  assert.equal(searchDirectory(directory, 'Morgan').length, 0);
});

test('search matches email and ignores case and surrounding space', () => {
  const directory = buildDirectory([parent], [], [], TODAY);
  assert.equal(searchDirectory(directory, '  MAI@EXAMPLE.TEST ').length, 1);
});

test('an empty search returns everyone rather than nobody', () => {
  const directory = buildDirectory([child, parent], [], [], TODAY);
  assert.equal(searchDirectory(directory, '   ').length, 2);
});

test('counts every role, and reports zero for the ones nobody holds', () => {
  const directory = buildDirectory(
    [child, parent],
    [role('p-child', 'player'), role('p-parent', 'guardian'), role('p-parent', 'coach')],
    [],
    TODAY,
  );
  const counts = roleCounts(directory);
  assert.equal(counts.get('player'), 1);
  assert.equal(counts.get('coach'), 1);
  assert.equal(counts.get('guardian'), 1);
  assert.equal(counts.get('referee'), 0);
});

test('people with no role this season are findable', () => {
  const directory = buildDirectory([child, parent], [role('p-child', 'player')], [], TODAY);
  assert.deepEqual(
    withoutRole(directory).map((s) => s.personId),
    ['p-parent'],
  );
});

test('legal-name verification carries through to the row', () => {
  const directory = buildDirectory([child, parent], [], [], TODAY);
  assert.equal(directory.find((s) => s.personId === 'p-child')?.legalNameVerified, true);
  assert.equal(directory.find((s) => s.personId === 'p-parent')?.legalNameVerified, false);
});

test('an unknown role from a form is rejected, not passed to the constraint', () => {
  assert.equal(parseSeasonRole('coach'), 'coach');
  assert.equal(parseSeasonRole('admin'), null, 'a club membership role is not a season role');
  assert.equal(parseSeasonRole(''), null);
  assert.equal(parseSeasonRole(undefined), null);
  assert.equal(parseSeasonRole(7), null);
});

test('the checklist drops blanks and duplicates, and keeps the order typed', () => {
  assert.deepEqual(
    parseDocumentChecklist(
      ['  Birth certificate ', '', ' Photo ID ', ' birth CERTIFICATE ', '   '].join('\n'),
    ),
    ['Birth certificate', 'Photo ID'],
  );
});

test('an empty checklist is an empty list, not a list containing nothing', () => {
  assert.deepEqual(parseDocumentChecklist('   \n \n'), []);
});

test('windows line endings split the same way', () => {
  assert.deepEqual(parseDocumentChecklist('Passport\r\nPhoto ID\r\n'), ['Passport', 'Photo ID']);
});
