import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MINIMUM_LENGTH, passwordProblem } from './password.ts';

const EMAIL = 'dana.reyes@riverbend.example';
const GOOD = 'correct horse battery staple';

test('a good passphrase is accepted', () => {
  assert.equal(passwordProblem(GOOD, GOOD, EMAIL), null);
});

test('length is the requirement, not composition', () => {
  // No capital, no digit, no symbol — and fine, because length is what
  // actually makes a password hard to guess.
  assert.equal(passwordProblem('a'.repeat(MINIMUM_LENGTH) + 'bc', 'a'.repeat(MINIMUM_LENGTH) + 'bc', EMAIL), null);
  assert.match(passwordProblem('Sh0rt!', 'Sh0rt!', EMAIL) ?? '', /at least 12/);
});

test('a mismatch is reported as a mismatch', () => {
  assert.match(passwordProblem(GOOD, GOOD + 'x', EMAIL) ?? '', /do not match/);
});

test('the length complaint comes before the mismatch complaint', () => {
  // Otherwise somebody fixes the typo, resubmits, and is told about length
  // on the second attempt instead of the first.
  assert.match(passwordProblem('short', 'different', EMAIL) ?? '', /at least 12/);
});

test('a password cannot be the person’s own email address', () => {
  assert.match(passwordProblem(EMAIL, EMAIL, EMAIL) ?? '', /email address/);
  assert.match(
    passwordProblem('dana.reyes-is-here', 'dana.reyes-is-here', EMAIL) ?? '',
    /email address/,
  );
});

test('a short local part does not poison every password', () => {
  // "jo@x.test" must not make every password containing "jo" invalid.
  assert.equal(passwordProblem('a joyful thing indeed', 'a joyful thing indeed', 'jo@x.test'), null);
});

test('the obvious guesses are refused however they are dressed up', () => {
  for (const bad of ['MyPassword12345', 'letsdatatalk2027', 'football-club-1', 'ChangeMe please']) {
    assert.notEqual(passwordProblem(bad, bad, EMAIL), null, bad);
  }
});
