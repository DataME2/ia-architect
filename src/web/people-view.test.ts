import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guardian, person, TODAY } from '../domain/test-fixtures.ts';
import type { PersonRole } from '../domain/types.ts';
import {
  buildDirectory,
  clampPage,
  ilikePattern,
  pageCount,
  parseDocumentChecklist,
  parsePage,
  parseRoleFilter,
  parseSeasonRole,
  rangeFor,
  summariseRoles,
  UNKNOWN_DATE_OF_BIRTH,
  UNROSTERED,
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

test('ilikePattern wraps a trimmed search in wildcards', () => {
  assert.equal(ilikePattern('  Alex  '), '%Alex%');
});

test('ilikePattern is null for nothing typed, not an empty pattern that matches everyone', () => {
  assert.equal(ilikePattern(''), null);
  assert.equal(ilikePattern('   '), null);
});

test('ilikePattern escapes ILIKE wildcards so a literal % or _ is not a wildcard', () => {
  assert.equal(ilikePattern('50%'), '%50\\%%');
  assert.equal(ilikePattern('a_b'), '%a\\_b%');
  assert.equal(ilikePattern('a\\b'), '%a\\\\b%');
});

test('ilikePattern drops characters that would break the .or() filter string rather than fail the search', () => {
  assert.equal(ilikePattern('Smith, John'), '%Smith John%');
  assert.equal(ilikePattern('O\'Brien (Jr)'), "%O'Brien Jr%");
});

test('summariseRoles counts every role and reports zero for the ones nobody holds', () => {
  const summary = summariseRoles(
    2,
    [role('p-child', 'player'), role('p-parent', 'guardian'), role('p-parent', 'coach')],
  );
  assert.equal(summary.total, 2);
  assert.equal(summary.byRole.get('player'), 1);
  assert.equal(summary.byRole.get('coach'), 1);
  assert.equal(summary.byRole.get('guardian'), 1);
  assert.equal(summary.byRole.get('referee'), 0);
});

test('summariseRoles counts a Person with two roles once toward unrostered, not twice', () => {
  const summary = summariseRoles(
    2,
    [role('p-parent', 'guardian'), role('p-parent', 'coach')],
  );
  assert.equal(summary.unrostered, 1, 'p-child holds nothing; p-parent holds two roles and is rostered once');
});

test('summariseRoles never reports unrostered below zero, however the counts arrive', () => {
  // Defensive: role rows for a Person not counted in totalPeople should not
  // produce a negative "unrostered", which would read as a data error.
  assert.equal(summariseRoles(0, [role('p-parent', 'coach')]).unrostered, 0);
});

test('parseRoleFilter accepts a season role, the unrostered sentinel, or neither', () => {
  assert.equal(parseRoleFilter('coach'), 'coach');
  assert.equal(parseRoleFilter(UNROSTERED), UNROSTERED);
  assert.equal(parseRoleFilter('admin'), null);
  assert.equal(parseRoleFilter(undefined), null);
});

test('parsePage defaults to the first page for anything that is not a positive integer', () => {
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage('0'), 1);
  assert.equal(parsePage('-4'), 1);
  assert.equal(parsePage('abc'), 1);
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage('2.5'), 1);
});

test('pageCount is at least one even when there is nothing to page through', () => {
  assert.equal(pageCount(0, 50), 1);
  assert.equal(pageCount(50, 50), 1);
  assert.equal(pageCount(51, 50), 2);
  assert.equal(pageCount(100, 50), 2);
});

test('clampPage pulls a page back inside range rather than showing nothing', () => {
  assert.equal(clampPage(1, 100, 50), 1);
  assert.equal(clampPage(5, 100, 50), 2, 'only 2 pages exist at 100 rows and a page size of 50');
  assert.equal(clampPage(0, 100, 50), 1);
});

test('rangeFor is zero-indexed and inclusive on both ends', () => {
  assert.deepEqual(rangeFor(1, 50), { from: 0, to: 49 });
  assert.deepEqual(rangeFor(2, 50), { from: 50, to: 99 });
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
