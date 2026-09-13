import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { bindingBases, erasureVerdict, explainRefusal } from './erasure.ts';
import { authorityHasEnded, retentionState } from './retention.ts';
import { MINIMUMS, frameworkForJurisdiction } from './types.ts';
import type { RetentionBasis } from './types.ts';

const TODAY = '2026-09-13';
const AU = MINIMUMS.AU_PRIVACY_ACT;

const basis = (over: Partial<RetentionBasis> = {}): RetentionBasis => ({
  basis: 'statutory_financial',
  expiresOn: '2033-06-30',
  detail: null,
  ...over,
});

describe('erasureVerdict — BR49, honoured or refused with a named basis', () => {
  it('erases when nothing binds', () => {
    assert.deepEqual(erasureVerdict([], TODAY), { erase: true });
  });

  it('erases when every basis has lapsed', () => {
    const verdict = erasureVerdict([basis({ expiresOn: '2020-01-01' })], TODAY);
    assert.equal(verdict.erase, true);
  });

  it('refuses while a basis binds, and names it', () => {
    const verdict = erasureVerdict([basis()], TODAY);
    assert.equal(verdict.erase, false);
    assert.equal(verdict.erase === false && verdict.bases.length, 1);
  });

  it('names every binding basis, not the first one found', () => {
    const verdict = erasureVerdict(
      [basis(), basis({ basis: 'child_safety', expiresOn: '2039-01-01' })],
      TODAY,
    );
    // Telling a family the one reason you thought of first is how a refusal
    // gets re-litigated.
    assert.equal(verdict.erase === false && verdict.bases.length, 2);
  });

  it('reports when it becomes honourable — the latest expiry, not the earliest', () => {
    const verdict = erasureVerdict(
      [basis({ expiresOn: '2030-01-01' }), basis({ basis: 'child_safety', expiresOn: '2039-01-01' })],
      TODAY,
    );
    assert.equal(verdict.erase === false && verdict.honourableFrom, '2039-01-01');
  });

  it('reports no date at all when a basis never expires (BR70)', () => {
    const verdict = erasureVerdict(
      [basis({ expiresOn: '2030-01-01' }), basis({ basis: 'life_member', expiresOn: null })],
      TODAY,
    );
    // Null rather than a far-future date: there is no day on which this
    // becomes erasable, and offering one would be a lie of arithmetic.
    assert.equal(verdict.erase === false && verdict.honourableFrom, null);
  });

  it('treats a basis expiring today as still binding', () => {
    assert.equal(bindingBases([basis({ expiresOn: TODAY })], TODAY).length, 1);
  });
});

describe('explainRefusal — a parent has to be able to read it', () => {
  it('says when it can be erased', () => {
    const words = explainRefusal(erasureVerdict([basis({ expiresOn: '2033-06-30' })], TODAY));
    assert.match(words, /financial records/);
    assert.match(words, /from 2033-06-30/);
  });

  it('says plainly that nothing changes, when nothing does', () => {
    const words = explainRefusal(erasureVerdict([basis({ basis: 'life_member', expiresOn: null })], TODAY));
    assert.match(words, /no date on which that changes/);
  });

  it('lists several reasons readably', () => {
    const words = explainRefusal(erasureVerdict(
      [basis(), basis({ basis: 'child_safety', expiresOn: '2039-01-01' })], TODAY));
    assert.match(words, /, and /);
  });
});

describe('retentionState — BR40, participation rather than one clock', () => {
  const input = (over: Partial<Parameters<typeof retentionState>[0]> = {}) => ({
    lastParticipationEndedOn: '2026-06-30' as const,
    isLifeMember: false,
    deceasedOn: null,
    contactConfirmedAt: null,
    bases: [],
    ...over,
  });

  it('keeps someone who participated within the ten-year floor', () => {
    assert.equal(retentionState(input(), AU, TODAY).state, 'active');
    assert.equal(retentionState(input({ lastParticipationEndedOn: '2017-06-30' }), AU, TODAY).state, 'active');
  });

  it('proposes disposal once the period has passed and nothing binds', () => {
    assert.equal(retentionState(input({ lastParticipationEndedOn: '2015-06-30' }), AU, TODAY).state, 'due_for_disposal');
  });

  it('does not propose disposal while a basis binds', () => {
    const verdict = retentionState(
      input({ lastParticipationEndedOn: '2015-06-30', bases: [basis()] }), AU, TODAY);
    assert.equal(verdict.state, 'lapsed');
  });

  it('never proposes a life member, living or dead (BR69, BR70)', () => {
    assert.equal(retentionState(input({ isLifeMember: true, contactConfirmedAt: TODAY }), AU, TODAY).state, 'life_member');
    const dead = retentionState(
      input({ isLifeMember: true, deceasedOn: '2019-04-01', lastParticipationEndedOn: '1975-06-30' }), AU, TODAY);
    // The one who would otherwise be most disposable is the one BR70 exists for.
    assert.equal(dead.state, 'life_member');
    assert.match(dead.detail, /BR70/);
  });

  it('flags a living life member nobody has confirmed (BR71)', () => {
    assert.equal(retentionState(input({ isLifeMember: true, contactConfirmedAt: '2020-01-01' }), AU, TODAY).state, 'contact_stale');
    assert.equal(retentionState(input({ isLifeMember: true, contactConfirmedAt: null }), AU, TODAY).state, 'contact_stale');
  });

  it('treats no participation at all as lapsed rather than disposable', () => {
    // A Person with no season may be a guardian who has never played. They
    // are not proposed for disposal on the strength of an absent record.
    assert.equal(retentionState(input({ lastParticipationEndedOn: null }), AU, TODAY).state, 'lapsed');
  });
});

describe('authorityHasEnded — BR67', () => {
  it('ends on the eighteenth birthday and not before', () => {
    assert.equal(authorityHasEnded('2008-09-13', TODAY), true);
    assert.equal(authorityHasEnded('2008-09-14', TODAY), false);
  });
});

describe('frameworkForJurisdiction — BR52', () => {
  it('maps each side of the Tasman', () => {
    assert.equal(frameworkForJurisdiction('AU-QLD'), 'AU_PRIVACY_ACT');
    assert.equal(frameworkForJurisdiction('NZ-AUK'), 'NZ_PRIVACY_ACT');
  });
});
