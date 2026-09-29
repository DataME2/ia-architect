import assert from 'node:assert/strict';
import { test } from 'node:test';

import { changedFields, legalNameChanged, parsePersonEdit } from './person-edit.ts';

const TODAY = '2026-09-29';
const base = {
  legalGivenNames: 'Pedro',
  legalFamilyName: 'Coral Tavera',
  preferredName: 'Peter',
  email: 'karen.alfonso.reina@gmail.com',
  dateOfBirth: '2009-03-31',
};

test('a clean edit is tidied, and the email lower-cased', () => {
  const r = parsePersonEdit({ ...base, legalGivenNames: '  Pedro ', email: 'Karen.Alfonso.Reina@Gmail.com' }, TODAY);
  assert.deepEqual(r, { ok: true, value: base });
});

test('both legal names are required', () => {
  assert.equal(parsePersonEdit({ ...base, legalFamilyName: ' ' }, TODAY).ok, false);
});

test('blank preferred name and email become null, not empty strings', () => {
  const r = parsePersonEdit({ ...base, preferredName: '', email: '' }, TODAY);
  assert.equal(r.ok && r.value.preferredName, null);
  assert.equal(r.ok && r.value.email, null);
});

test('a malformed email is refused', () => {
  assert.equal(parsePersonEdit({ ...base, email: 'karen@gmail' }, TODAY).ok, false);
});

test('a blank birth date keeps the import placeholder rather than inventing one', () => {
  const r = parsePersonEdit({ ...base, dateOfBirth: '' }, TODAY);
  assert.equal(r.ok && r.value.dateOfBirth, '1900-01-01');
});

test('a future birth date is refused', () => {
  assert.equal(parsePersonEdit({ ...base, dateOfBirth: '2027-01-01' }, TODAY).ok, false);
});

test('BR55 — only a real change to the legal name withdraws its verification', () => {
  const after = parsePersonEdit(base, TODAY);
  assert.ok(after.ok);
  if (!after.ok) return;
  assert.equal(legalNameChanged({ legalGivenNames: 'Pedro', legalFamilyName: 'Coral  Tavera' }, after.value), false,
    'spacing is not a new name');
  assert.equal(legalNameChanged({ legalGivenNames: 'Pedro', legalFamilyName: 'Koral Tavera' }, after.value), true);
});

test('changedFields names what changed and nothing else', () => {
  assert.deepEqual(changedFields({ ...base, email: 'admin@northstarfc.com.au' }, base), ['email']);
});
