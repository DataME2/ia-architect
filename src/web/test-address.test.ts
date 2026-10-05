import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isReservedTestAddress, testAddressNote } from './test-address.ts';

describe('isReservedTestAddress', () => {
  it('recognises the reserved test domains', () => {
    assert.equal(isReservedTestAddress('qa.itmanager@northstarfc.test'), true);
    assert.equal(isReservedTestAddress('someone@example.com'), true);
    assert.equal(isReservedTestAddress('x@mail.example.org'), true);
    assert.equal(isReservedTestAddress('x@club.invalid'), true);
  });

  it('never matches a real address, including one that merely looks like a test', () => {
    assert.equal(isReservedTestAddress('karen@gmail.com'), false);
    assert.equal(isReservedTestAddress('admin@northstarfc.com.au'), false);
    assert.equal(isReservedTestAddress('x@testclub.com'), false);
    assert.equal(isReservedTestAddress('x@example.com.au'), false);
    assert.equal(isReservedTestAddress('no-at-sign'), false);
  });
});

describe('testAddressNote', () => {
  it('says plainly that nothing was emailed, and only for a test address', () => {
    assert.match(testAddressNote('qa.coach@northstarfc.test') ?? '', /no email was sent/);
    assert.equal(testAddressNote('karen@gmail.com'), null);
  });
});
