import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { DEFAULT_DESTINATION, safeDestination } from './safe-destination.ts';

describe('safeDestination', () => {
  test('keeps a destination we publish', () => {
    assert.equal(safeDestination('/registrar'), '/registrar');
    assert.equal(safeDestination('/register'), '/register');
  });

  test('refuses a protocol-relative URL', () => {
    // The bug this exists for: `//evil.example` passes a `startsWith('/')`
    // check and sends the browser to another host, straight after sign-in.
    assert.equal(safeDestination('//evil.example'), DEFAULT_DESTINATION);
    assert.equal(safeDestination('//evil.example/registrar'), DEFAULT_DESTINATION);
  });

  test('refuses an absolute URL', () => {
    assert.equal(safeDestination('https://evil.example'), DEFAULT_DESTINATION);
    assert.equal(safeDestination('http://evil.example/registrar'), DEFAULT_DESTINATION);
  });

  test('refuses a path we do not publish, however innocent', () => {
    assert.equal(safeDestination('/registrar/../../etc'), DEFAULT_DESTINATION);
    assert.equal(safeDestination('/admin'), DEFAULT_DESTINATION);
    assert.equal(safeDestination('/registrar?x=1'), DEFAULT_DESTINATION);
  });

  test('falls back when there is nothing to fall back from', () => {
    assert.equal(safeDestination(undefined), DEFAULT_DESTINATION);
    assert.equal(safeDestination(null), DEFAULT_DESTINATION);
    assert.equal(safeDestination(''), DEFAULT_DESTINATION);
  });
});
