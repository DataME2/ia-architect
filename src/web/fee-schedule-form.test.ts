import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  duplicateOf, gaps, parseRate, parseSchedule, standings, roleLabel, dimensionLabel,
} from './fee-schedule-form.ts';
import type { FeeRate } from '../domain/officiating/fees.ts';

const rate = (over: Partial<FeeRate> = {}): FeeRate => ({
  role: 'referee',
  competition: null,
  classification: null,
  appointedBy: null,
  amountCents: 4500,
  ...over,
});

describe('parseSchedule — BR115, a dated version rather than an edited row', () => {
  it('takes a date and an optional note', () => {
    const parsed = parseSchedule({ effectiveFrom: '2026-03-01', note: 'AGM, February' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.effectiveFrom, '2026-03-01');
    assert.equal(parsed.ok && parsed.note, 'AGM, February');
  });

  it('treats a blank note as no note', () => {
    const parsed = parseSchedule({ effectiveFrom: '2026-03-01', note: '   ' });
    assert.equal(parsed.ok && parsed.note, null);
  });

  it('refuses a schedule with no start date, which is its whole identity', () => {
    assert.equal(parseSchedule({ note: 'oops' }).ok, false);
    assert.equal(parseSchedule({ effectiveFrom: '1 March 2026' }).ok, false);
    assert.equal(parseSchedule({ effectiveFrom: '2026-3-1' }).ok, false);
  });
});

describe('parseRate — one cell of the club’s own table', () => {
  it('reads dollars into cents', () => {
    const parsed = parseRate({ role: 'referee', amount: '$45.50' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.rate.amountCents, 4550);
  });

  it('treats every blank dimension as "any"', () => {
    const parsed = parseRate({
      role: 'assistant_referee', competition: '  ', classification: '', appointedBy: '', amount: '30',
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.rate.competition, null);
    assert.equal(parsed.ok && parsed.rate.classification, null);
    assert.equal(parsed.ok && parsed.rate.appointedBy, null);
  });

  it('keeps a named dimension as typed', () => {
    const parsed = parseRate({
      role: 'referee', competition: 'Div 3', appointedBy: 'association', amount: '60',
    });
    assert.equal(parsed.ok && parsed.rate.competition, 'Div 3');
    assert.equal(parsed.ok && parsed.rate.appointedBy, 'association');
  });

  it('refuses a role the schema does not have', () => {
    assert.equal(parseRate({ role: 'timekeeper', amount: '10' }).ok, false);
    assert.equal(parseRate({ amount: '10' }).ok, false);
  });

  it('refuses an appointing party the schema does not have', () => {
    assert.equal(parseRate({ role: 'referee', appointedBy: 'somebody', amount: '10' }).ok, false);
  });

  it('refuses a negative rate — an official does not pay the club', () => {
    // Unlike a family's balance, where a credit is a real state (BR3).
    const parsed = parseRate({ role: 'referee', amount: '-10' });
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok === false ? parsed.error : '', /cannot be negative/);
  });

  it('refuses an amount that is not one', () => {
    assert.equal(parseRate({ role: 'referee', amount: '' }).ok, false);
    assert.equal(parseRate({ role: 'referee', amount: 'forty five' }).ok, false);
  });

  it('accepts a rate of zero, which is a club saying it pays nothing for this', () => {
    const parsed = parseRate({ role: 'fourth_official', amount: '0' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.rate.amountCents, 0);
  });
});

describe('duplicateOf — the clash named before the constraint says it', () => {
  const existing = [
    rate({ role: 'referee', competition: 'Div 3' }),
    rate({ role: 'referee' }),
    rate({ role: 'assistant_referee', appointedBy: 'club' }),
  ];

  it('finds the row that already answers this cell', () => {
    const clash = duplicateOf(existing, rate({ role: 'referee', competition: 'Div 3', amountCents: 9999 }));
    assert.notEqual(clash, null);
    assert.equal(clash?.amountCents, 4500);
  });

  it('matches "any" against "any" — two rows saying nothing are one cell', () => {
    assert.notEqual(duplicateOf(existing, rate({ role: 'referee' })), null);
  });

  it('compares a competition the way rateFor does, trimmed and case-insensitively', () => {
    // "Div 3" and "div 3 " are one competition typed twice, not two.
    assert.notEqual(duplicateOf(existing, rate({ role: 'referee', competition: ' div 3 ' })), null);
  });

  it('does not confuse a named dimension with an unnamed one', () => {
    assert.equal(duplicateOf(existing, rate({ role: 'assistant_referee' })), null);
    assert.equal(duplicateOf(existing, rate({ role: 'fourth_official' })), null);
  });
});

describe('standings — which schedule is actually being used', () => {
  const s = (id: string, effectiveFrom: string) => ({ id, effectiveFrom, note: null, rateCount: 3 });

  it('names the latest schedule that has started as the one in force', () => {
    const rows = standings([s('a', '2025-03-01'), s('b', '2026-03-01'), s('c', '2027-01-01')], '2026-09-15');
    assert.deepEqual(
      rows.map((r) => [r.id, r.standing]),
      [['c', 'future'], ['b', 'in-force'], ['a', 'superseded']],
    );
  });

  it('puts the newest first, which is the one a club just published', () => {
    const rows = standings([s('old', '2024-01-01'), s('new', '2026-01-01')], '2026-09-15');
    assert.deepEqual(rows.map((r) => r.id), ['new', 'old']);
  });

  it('has nothing in force when every schedule starts in the future', () => {
    const rows = standings([s('a', '2027-01-01')], '2026-09-15');
    assert.deepEqual(rows.map((r) => r.standing), ['future']);
  });

  it('treats a schedule starting today as in force, not future', () => {
    const rows = standings([s('a', '2026-09-15')], '2026-09-15');
    assert.equal(rows[0]?.standing, 'in-force');
  });

  it('does not reorder its argument', () => {
    const given = [s('old', '2024-01-01'), s('new', '2026-01-01')];
    standings(given, '2026-09-15');
    assert.deepEqual(given.map((r) => r.id), ['old', 'new']);
  });
});

describe('gaps — what a club is told before it trusts the table', () => {
  it('says an empty schedule prices nothing', () => {
    assert.match(gaps([])[0] ?? '', /no rates yet/);
  });

  it('names the roles with no rate at all', () => {
    const warnings = gaps([rate({ role: 'referee' })]);
    assert.match(warnings[0] ?? '', /assistant referee or fourth official/);
    // The distinction that matters: no rate is not a rate of zero.
    assert.match(warnings[0] ?? '', /rather than a rate of zero/);
  });

  it('says nothing when every role is priced', () => {
    assert.deepEqual(
      gaps([rate({ role: 'referee' }), rate({ role: 'assistant_referee' }), rate({ role: 'fourth_official' })]),
      [],
    );
  });
});

describe('labels', () => {
  it('spells out a role and shows an unknown one rather than hiding it', () => {
    assert.equal(roleLabel('fourth_official'), 'Fourth official');
    assert.equal(roleLabel('timekeeper'), 'timekeeper');
  });

  it('reads an unnamed dimension as "Any"', () => {
    assert.equal(dimensionLabel(null), 'Any');
    assert.equal(dimensionLabel('  '), 'Any');
    assert.equal(dimensionLabel('Div 3'), 'Div 3');
  });
});
