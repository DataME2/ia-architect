import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatCents, parseAmountCents } from './money.ts';

test('formats cents as dollars, keeping both decimal places', () => {
  assert.equal(formatCents(0), '$0.00');
  assert.equal(formatCents(4500), '$45.00');
  assert.equal(formatCents(4505), '$45.05');
  assert.equal(formatCents(120050), '$1200.50');
});

test('formats a credit with the sign outside the dollar mark', () => {
  assert.equal(formatCents(-2550), '-$25.50');
});

test('accepts what a registrar actually types', () => {
  for (const [input, cents] of [
    ['120', 12000],
    ['120.50', 12050],
    ['$120.50', 12050],
    [' 1,200.05 ', 120005],
    ['0.5', 50],
  ] as const) {
    const result = parseAmountCents(input);
    assert.ok(result.ok, `${input} should parse`);
    assert.equal(result.cents, cents, input);
  }
});

test('a credit parses as a negative amount, because BR3 allows one', () => {
  const result = parseAmountCents('-25.50');
  assert.ok(result.ok);
  assert.equal(result.cents, -2550);
});

test('rejects a third decimal rather than rounding it away', () => {
  const result = parseAmountCents('10.005');
  assert.ok(!result.ok);
});

test('rejects empty and non-numeric input with a message, not an exception', () => {
  for (const input of ['', '   ', 'twelve', '12.4.5', '$']) {
    const result = parseAmountCents(input);
    assert.ok(!result.ok, `${input} should be rejected`);
    assert.ok(result.error.length > 0);
  }
});

test('round-trips through formatting', () => {
  for (const cents of [0, 1, 99, 100, 4505, 120050]) {
    const parsed = parseAmountCents(formatCents(cents));
    assert.ok(parsed.ok);
    assert.equal(parsed.cents, cents);
  }
});
