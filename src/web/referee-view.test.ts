import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  accreditationOn,
  addDays,
  classificationOn,
  lapsingWithin,
  rosterFlags,
  rosterOrder,
  type Accreditation,
  type ClassificationRecord,
  type RefereeSummary,
} from './referee-view.ts';

const cls = (
  level: string,
  effectiveFrom: string,
  sightedAt: string | null = '2026-01-01T00:00:00Z',
): ClassificationRecord => ({ level, effectiveFrom, sightedAt });

const acc = (
  kind: string,
  expiresOn: string | null,
  verifiedAt: string | null = '2026-01-01T00:00:00Z',
  issuedOn: string | null = '2026-01-01',
): Accreditation => ({ kind, identifier: 'X-1', issuedOn, expiresOn, verifiedAt });

const referee = (over: Partial<RefereeSummary> = {}): RefereeSummary => ({
  personId: 'p1',
  name: 'Marcus Whistle',
  officialNumber: 'FQ-88213',
  startedOn: '2021-03-01',
  retiredOn: null,
  classifications: [],
  accreditations: [],
  ...over,
});

test('classificationOn', async (t) => {
  const history = [cls('Level 4', '2026-07-01'), cls('Club Based 4.5', '2021-03-01')];

  await t.test('answers the date asked about, not the latest level', () => {
    // The question BR8 actually asks. A current-value column would answer
    // "Level 4" for a March match and retrospectively justify a designation
    // that was wrong when it was made.
    assert.equal(classificationOn(history, '2026-03-15')?.level, 'Club Based 4.5');
    assert.equal(classificationOn(history, '2026-08-15')?.level, 'Level 4');
  });

  await t.test('takes effect on the day it says, not the day after', () => {
    assert.equal(classificationOn(history, '2026-07-01')?.level, 'Level 4');
  });

  await t.test('is null before the first record, never the earliest level', () => {
    // Falling back would invent a qualification on exactly the dates where
    // the club has least evidence.
    assert.equal(classificationOn(history, '2019-01-01'), null);
    assert.equal(classificationOn([], '2026-01-01'), null);
  });

  await t.test('does not depend on the order rows arrive in', () => {
    const reversed = [cls('Club Based 4.5', '2021-03-01'), cls('Level 4', '2026-07-01')];
    assert.equal(classificationOn(reversed, '2026-08-15')?.level, 'Level 4');
  });
});

test('accreditationOn', async (t) => {
  await t.test('is measured against the fixture, not against today', () => {
    const fitness = acc('fitness', '2026-06-30');
    assert.equal(accreditationOn(fitness, '2026-05-01').kind, 'valid');
    assert.equal(accreditationOn(fitness, '2026-08-01').kind, 'expired');
  });

  await t.test('is valid on its own expiry date', () => {
    // A certificate valid "until 30 June" covers a game on 30 June.
    assert.equal(accreditationOn(acc('fitness', '2026-06-30'), '2026-06-30').kind, 'valid');
  });

  await t.test('never expires when it has no expiry', () => {
    assert.equal(accreditationOn(acc('laws', null), '2030-01-01').kind, 'valid');
  });

  await t.test('is not yet held before it was issued', () => {
    assert.equal(
      accreditationOn(acc('fitness', '2026-12-31', '2026-01-01T00:00:00Z', '2026-03-01'), '2026-02-01').kind,
      'not-yet',
    );
  });

  await t.test('unverified outranks expired', () => {
    // An accreditation nobody checked is not a lapsed one. Saying "expired"
    // implies somebody once verified it, which is the wrong thing to tell a
    // coordinator deciding whether to appoint.
    const never = acc('laws', '2020-01-01', null);
    assert.equal(accreditationOn(never, '2026-05-01').kind, 'unverified');
  });
});

test('lapsingWithin', async (t) => {
  await t.test('finds the card that expires mid-season', () => {
    // The failure this exists for: found on a Thursday with a fixture on
    // Saturday and nobody to replace them.
    const found = lapsingWithin([acc('fitness', '2026-06-30')], '2026-05-15', 60);
    assert.equal(found.length, 1);
  });

  await t.test('ignores one already expired — that is a different flag', () => {
    assert.equal(lapsingWithin([acc('fitness', '2026-01-01')], '2026-05-15', 60).length, 0);
  });

  await t.test('ignores one that never expires, and one nobody verified', () => {
    assert.equal(lapsingWithin([acc('laws', null)], '2026-05-15', 60).length, 0);
    assert.equal(lapsingWithin([acc('laws', '2026-06-01', null)], '2026-05-15', 60).length, 0);
  });
});

test('addDays', async (t) => {
  await t.test('crosses a month end', () => {
    assert.equal(addDays('2026-01-30', 3), '2026-02-02');
  });

  await t.test('crosses a leap day and a year end', () => {
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  });
});

test('rosterFlags', async (t) => {
  await t.test('says nothing is wrong by returning nothing', () => {
    const clean = referee({
      classifications: [cls('Level 4', '2026-01-01')],
      accreditations: [acc('fitness', '2027-01-01')],
    });
    assert.deepEqual(rosterFlags(clean, '2026-05-01'), []);
  });

  await t.test('flags a missing classification — BR8 cannot be evaluated without one', () => {
    const flags = rosterFlags(referee(), '2026-05-01');
    assert.equal(flags.some((f) => f.kind === 'no-classification'), true);
  });

  await t.test('distinguishes a classification nobody checked from one that is absent', () => {
    const claimed = referee({ classifications: [cls('Level 4', '2026-01-01', null)] });
    const flags = rosterFlags(claimed, '2026-05-01');
    assert.equal(flags.some((f) => f.kind === 'unverified-classification'), true);
    assert.equal(flags.some((f) => f.kind === 'no-classification'), false);
  });

  await t.test('puts retired first, because it explains every other flag', () => {
    const gone = referee({ retiredOn: '2026-02-01' });
    assert.equal(rosterFlags(gone, '2026-05-01')[0]?.kind, 'retired');
  });

  await t.test('does not flag a retirement that has not happened yet', () => {
    const leaving = referee({
      retiredOn: '2026-12-01',
      classifications: [cls('Level 4', '2026-01-01')],
    });
    assert.deepEqual(rosterFlags(leaving, '2026-05-01'), []);
  });

  await t.test('reports expiry and imminent expiry as different things', () => {
    const mixed = referee({
      classifications: [cls('Level 4', '2026-01-01')],
      accreditations: [acc('fitness', '2026-01-15'), acc('laws', '2026-06-15')],
    });
    const flags = rosterFlags(mixed, '2026-05-01');
    assert.equal(flags.some((f) => f.kind === 'expired' && f.what === 'fitness'), true);
    assert.equal(flags.some((f) => f.kind === 'lapsing' && f.what === 'laws'), true);
  });
});

test('rosterOrder', async (t) => {
  await t.test('working officials first, retired last', () => {
    const list = [
      referee({ personId: 'a', name: 'Zara Ali', retiredOn: '2026-01-01' }),
      referee({ personId: 'b', name: 'Marcus Whistle' }),
      referee({ personId: 'c', name: 'Ana Silva' }),
    ];
    assert.deepEqual(
      rosterOrder(list, '2026-05-01').map((r) => r.personId),
      ['c', 'b', 'a'],
    );
  });

  await t.test('somebody retiring later is still a working official', () => {
    const list = [
      referee({ personId: 'a', name: 'Ana Silva', retiredOn: '2026-12-01' }),
      referee({ personId: 'b', name: 'Zara Ali' }),
    ];
    assert.deepEqual(rosterOrder(list, '2026-05-01').map((r) => r.personId), ['a', 'b']);
  });
});
