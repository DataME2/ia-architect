import assert from 'node:assert/strict';
import { test } from 'node:test';

import { STARTER_TERMS, parseDiscount, parseFeeLine, termsValues } from './registration-fee-form.ts';
import { placeholdersIn } from './registration-price.ts';

const fields = {
  kind: 'club',
  name: 'Player Fee - Community Junior / MiniRoos / U8 to U12',
  amount: '$530',
  deposit: '',
  minAge: '8',
  maxAge: '12',
  adminOnly: true,
  standard: true,
};

test('a line as the pilot club writes it', () => {
  const p = parseFeeLine(fields);
  assert.ok(p.ok);
  assert.equal(p.value.amountCents, 53000);
  assert.equal(p.value.minAge, 8);
  assert.equal(p.value.depositCents, null);
});

test('a deposit is part of the fee, never more than it', () => {
  assert.ok(parseFeeLine({ ...fields, amount: '1,046', deposit: '200' }).ok);
  const p = parseFeeLine({ ...fields, amount: '100', deposit: '200' });
  assert.equal(p.ok, false);
});

test('what cannot be a fee is refused with a reason', () => {
  assert.equal(parseFeeLine({ ...fields, kind: 'other' }).ok, false);
  assert.equal(parseFeeLine({ ...fields, name: ' ' }).ok, false);
  assert.equal(parseFeeLine({ ...fields, amount: '-5' }).ok, false);
  assert.equal(parseFeeLine({ ...fields, minAge: '12', maxAge: '8' }).ok, false);
  assert.equal(parseFeeLine({ ...fields, minAge: 'eight' }).ok, false);
});

test('ages are optional: a line for everyone has none', () => {
  const p = parseFeeLine({ ...fields, kind: 'levy', name: 'Volunteer levy', amount: '50', minAge: '', maxAge: '' });
  assert.ok(p.ok);
  assert.equal(p.value.minAge, null);
  assert.equal(p.value.maxAge, null);
});

test('the discount is a percentage, at most 100', () => {
  assert.deepEqual(parseDiscount('15'), { ok: true, value: 1500 });
  assert.deepEqual(parseDiscount('12.5%'), { ok: true, value: 1250 });
  assert.equal(parseDiscount('150').ok, false);
  assert.equal(parseDiscount('fifteen').ok, false);
});

test('placeholder values come from value: fields, and blanks are dropped', () => {
  const v = termsValues([
    ['value:club_email', ' secretary@club.example '],
    ['value:date_in_future', ''],
    ['body', 'ignored'],
  ]);
  assert.deepEqual(v, { club_email: 'secretary@club.example' });
});

test('the starter terms name no particular club', () => {
  assert.equal(/northstar/i.test(STARTER_TERMS), false);
  assert.ok(placeholdersIn(STARTER_TERMS).includes('club'));
  assert.ok(placeholdersIn(STARTER_TERMS).includes('club_email'));
});

test('a levy is never "standard": it is charged to everyone it fits', () => {
  const p = parseFeeLine({ ...fields, kind: 'levy', name: 'Volunteer levy', amount: '50', minAge: '', maxAge: '' });
  assert.ok(p.ok);
  assert.equal(p.value.standard, false);
});
