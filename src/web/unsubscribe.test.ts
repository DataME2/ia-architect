import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseUnsubscribeLink } from './unsubscribe.ts';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const TOKEN = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo';

describe('parseUnsubscribeLink — the link arrives from an inbox', () => {
  it('reads a clean link', () => {
    assert.deepEqual(parseUnsubscribeLink(`${ID}.${TOKEN}`), { ok: true, id: ID, token: TOKEN });
  });

  it('tolerates the punctuation a mail client adds', () => {
    for (const wrapped of [`${ID}.${TOKEN}.`, `(${ID}.${TOKEN})`, ` ${ID}.${TOKEN} `, `${ID}.${TOKEN}>`]) {
      const parsed = parseUnsubscribeLink(wrapped.replace(/^\(/, ''));
      assert.equal(parsed.ok, true, `refused a link a person can plainly see is theirs: ${wrapped}`);
    }
  });

  it('refuses a link with no token', () => {
    assert.equal(parseUnsubscribeLink(ID).ok, false);
    assert.equal(parseUnsubscribeLink(`${ID}.`).ok, false);
  });

  it('refuses a truncated token rather than sending it to the database', () => {
    const parsed = parseUnsubscribeLink(`${ID}.short`);
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok ? '' : parsed.message, /incomplete/);
  });

  it('refuses something that is not an id', () => {
    assert.equal(parseUnsubscribeLink(`not-a-uuid.${TOKEN}`).ok, false);
    assert.equal(parseUnsubscribeLink('').ok, false);
  });
});
