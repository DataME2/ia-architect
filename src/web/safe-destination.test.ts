import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  DEFAULT_DESTINATION,
  landingFor,
  NO_CREDENTIAL_DESTINATION,
  safeDestination,
} from './safe-destination.ts';

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

test('landingFor', async (t) => {
  await t.test('sends the platform operator to the console', () => {
    // The account that cannot have a club, sent somewhere that does not
    // need one. Without this it lands on "No club yet", which is true and
    // reads like a fault.
    assert.equal(landingFor(null, true), '/platform');
    assert.equal(landingFor('', true), '/platform');
  });

  await t.test('sends everybody else to the queue', () => {
    assert.equal(landingFor(null, false), '/registrar');
  });

  await t.test('an asked-for destination still wins, for either', () => {
    // Somebody following an emailed link must arrive where the link points
    // whoever they are — including the operator setting their own password.
    assert.equal(landingFor('/set-password', true), '/set-password');
    assert.equal(landingFor('/registrar', true), '/registrar');
    assert.equal(landingFor('/platform', false), '/platform');
  });

  await t.test('an unpublished destination is still refused, for either', () => {
    assert.equal(landingFor('//evil.example', true), '/platform');
    assert.equal(landingFor('/admin', false), '/registrar');
  });
});

test('NO_CREDENTIAL_DESTINATION never asks for the thing the holder lacks', async (t) => {
  await t.test('is a destination we publish', () => {
    assert.equal(safeDestination(NO_CREDENTIAL_DESTINATION), NO_CREDENTIAL_DESTINATION);
  });

  // The regression this exists for: a dead link used to land on /sign-in,
  // which asks for a password. Somebody whose invitation expired never had
  // one, so that is a closed circle rather than a way back in.
  await t.test('is not the sign-in form', () => {
    assert.notEqual(NO_CREDENTIAL_DESTINATION, '/sign-in');
    assert.equal(NO_CREDENTIAL_DESTINATION, '/set-password');
  });
});
