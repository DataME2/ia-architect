/**
 * BR200: an amount says which currency it is, and two are never combined.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addMoney, formatCurrency, isCurrency, money } from './currency.ts';

test('formats with an unambiguous symbol and thousands separators', () => {
  assert.equal(formatCurrency(money(123456, 'AUD')), 'A$1,234.56');
  assert.equal(formatCurrency(money(1200000, 'NZD')), 'NZ$12,000.00');
  assert.equal(formatCurrency(money(-1205, 'NZD')), '-NZ$12.05');
  assert.equal(formatCurrency(money(7, 'AUD')), 'A$0.07');
});

test('adds the same currency and refuses two different ones', () => {
  assert.deepEqual(addMoney(money(100, 'AUD'), money(250, 'AUD')), { cents: 350, currency: 'AUD' });
  assert.throws(() => addMoney(money(100, 'AUD'), money(100, 'NZD')), TypeError);
});

test('an amount is whole cents', () => {
  assert.throws(() => money(10.5, 'AUD'), RangeError);
});

test('knows the two currencies and nothing else', () => {
  assert.equal(isCurrency('AUD'), true);
  assert.equal(isCurrency('NZD'), true);
  assert.equal(isCurrency('USD'), false);
  assert.equal(isCurrency(undefined), false);
});
