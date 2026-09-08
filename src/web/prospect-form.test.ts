import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MARKETING_CONSENT_WORDING, parseProspect } from './prospect-form.ts';

test('an email address is all that is required', () => {
  const parsed = parseProspect('  Coach@Riverbend.example  ', '');
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.ok && parsed.details, {
    email: 'coach@riverbend.example',
    phone: null,
    marketingConsent: false,
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

test('marketing consent defaults to refused when nothing was ticked', () => {
  for (const absent of [undefined, null, '', false, 'off']) {
    const parsed = parseProspect('a@b.example', null, absent);
    assert.equal(parsed.ok && parsed.details.marketingConsent, false, String(absent));
  }
});

test('consent is only ever the affirmative case', () => {
  // 'on' is what a ticked HTML checkbox posts. Nothing else counts, so a
  // stray value can never be read as permission (BR93).
  assert.equal(parseProspect('a@b.example', null, 'on').ok, true);
  assert.equal(
    (parseProspect('a@b.example', null, 'on') as { details: { marketingConsent: boolean } })
      .details.marketingConsent,
    true,
  );
  for (const odd of ['yes', 'true', '1', 'ON']) {
    const parsed = parseProspect('a@b.example', null, odd);
    assert.equal(parsed.ok && parsed.details.marketingConsent, false, odd);
  }
});

test('refusing consent never blocks entry', () => {
  // The whole of BR93: the unticked answer still gets in.
  assert.equal(parseProspect('a@b.example', null, undefined).ok, true);
});

test('the recorded wording says what it is asking for and that it is optional', () => {
  assert.match(MARKETING_CONSENT_WORDING, /optional/i);
  assert.match(MARKETING_CONSENT_WORDING, /Privacy Act 1988/);
  assert.match(MARKETING_CONSENT_WORDING, /Privacy Act 2020/);
  assert.match(MARKETING_CONSENT_WORDING, /not sell/i);
  assert.match(MARKETING_CONSENT_WORDING, /stop at any time/i);
});
