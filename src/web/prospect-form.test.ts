import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseProspect } from './prospect-form.ts';

test('an email address is all that is required', () => {
  const parsed = parseProspect('  Coach@Riverbend.example  ', '');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.ok && parsed.details, {
    email: 'coach@riverbend.example',
    phone: null,
  });
});

test('a phone number is kept as given, not reformatted', () => {
  const parsed = parseProspect('a@b.example', '  +61 400 111 222 ');
  assert.equal(parsed.ok && parsed.details.phone, '+61 400 111 222');
});

test('nothing at all is refused, with a sentence that says what to do', () => {
  const parsed = parseProspect('   ', '0400 000 000');
  assert.equal(parsed.ok, false);
  assert.match(parsed.ok ? '' : parsed.error, /email address/i);
});

test('an address-shaped string is accepted even if it may not exist', () => {
  for (const email of ['a@b', 'x@y.example', "o'brien@club.example"]) {
    assert.equal(parseProspect(email, null).ok, true, email);
  }
});

test('what is refused is what cannot be an address at all', () => {
  for (const email of ['nobody', '@nowhere', 'trailing@', 'two words@x.example']) {
    assert.equal(parseProspect(email, null).ok, false, email);
  }
});
