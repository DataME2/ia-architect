/**
 * The public event calculator's decisions (BR222): what it offers, how it
 * reads what was typed, and how it says the answer.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addLine,
  breakEvenSentence,
  calculatorView,
  EVENT_TYPES,
  initialState,
  lineWorking,
  parseCount,
  parseLineAmount,
  removeLine,
  updateLine,
  type CalculatorState,
} from './event-calculator.ts';

function set(state: CalculatorState, amounts: Record<string, string>): CalculatorState {
  return Object.entries(amounts).reduce((s, [label, amount]) => {
    const line = s.lines.find((l) => l.label === label);
    assert.ok(line, `no line labelled ${label}`);
    return updateLine(s, line.id, { amount });
  }, state);
}

test('no preset carries an amount, a governing body’s charge least of all (BR211)', () => {
  for (const type of EVENT_TYPES) {
    const s = initialState(type);
    assert.ok(s.lines.length > 0, type);
    assert.ok(s.lines.every((l) => l.amount === ''), type);
    assert.ok(s.lines.some((l) => l.category === 'sanctioning'), `${type} offers a governing-body line`);
  }
});

test('carnivals and tournaments break even on teams; clinics on participants (#137)', () => {
  assert.equal(initialState('carnival').driver, 'teams');
  assert.equal(initialState('tournament').driver, 'teams');
  assert.equal(initialState('holiday-clinic').driver, 'participants');
  assert.equal(initialState('other').driver, 'participants');
  assert.equal(initialState('holiday-clinic').lines.find((l) => l.label === 'Participant fees')?.unit, 'perParticipantPerDay');
});

test('a holiday clinic, end to end: the figures, the working and the break-even', () => {
  let s = { ...initialState('holiday-clinic'), days: '3', juniors: '30' };
  s = set(s, {
    'Participant fees': '45',
    'Venue hire': '300',
    Coaches: '400',
    Equipment: '200',
    'Participant kit': '15',
    'Governing-body charge — juniors': '3.30',
  });
  const v = calculatorView(s);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.income, 'A$4,050.00');
  assert.equal(v.costs, 'A$2,849.00');
  assert.equal(v.result, 'A$1,201.00');
  assert.equal(v.resultKind, 'surplus');
  assert.deepEqual(v.perParticipant, { income: 'A$135.00', cost: 'A$94.97' });
  assert.equal(v.breakEven, 'Breaks even at 20 participants, with juniors and seniors in the proportion you entered. You have entered 30 participants.');
  const fees = s.lines.find((l) => l.label === 'Participant fees');
  assert.deepEqual(v.lines[fees?.id ?? ''], { total: 'A$4,050.00', working: '× 30 participants × 3 days' });
  assert.equal(v.hasGoverningBodyCharge, true);
  assert.deepEqual(
    v.scenarios.map((r) => [r.label, r.size, r.result, r.deficit]),
    [
      ['20% fewer participants', '24 participants', 'A$500.80', false],
      ['As entered', '30 participants', 'A$1,201.00', false],
      ['20% more participants', '36 participants', 'A$1,901.20', false],
    ],
  );
});

test('a carnival priced too low says it cannot break even, and why', () => {
  let s = { ...initialState('carnival'), teams: '40', juniors: '400' };
  s = set(s, {
    'Team entry fees': '250',
    Sponsorship: '500',
    'Venue hire': '1000',
    Referees: '60',
    'First aid': '300',
    'Medals and participation gifts': '5',
    Insurance: '400',
    'Governing-body charge — juniors': '15',
  });
  const v = calculatorView(s);
  assert.equal(v.ok, true);
  if (!v.ok) return;
  assert.equal(v.resultKind, 'deficit');
  assert.equal(v.result, 'A$1,600.00');
  assert.match(v.breakEven, /^It can’t break even by growing: each extra team costs at least what it brings in/);
  assert.equal(v.costRows[0]?.label, 'Governing-body charges');
  assert.equal(v.costRows[0]?.percent, 50); // 6000 of 12100
});

test('the currency is shown, never converted (BR200)', () => {
  const aud = set({ ...initialState('other'), juniors: '10' }, { 'Participant fees': '20' });
  const nzd = { ...aud, currency: 'NZD' as const };
  const a = calculatorView(aud);
  const n = calculatorView(nzd);
  assert.ok(a.ok && n.ok);
  if (!a.ok || !n.ok) return;
  assert.equal(a.income, 'A$200.00');
  assert.equal(n.income, 'NZ$200.00');
});

test('a mistyped figure hides the estimate instead of counting as nothing', () => {
  const s = set({ ...initialState('other'), juniors: 'twelve' }, { 'Venue hire': '12.345' });
  const v = calculatorView(s);
  assert.equal(v.ok, false);
  if (v.ok) return;
  assert.ok(v.errors.juniors);
  const venue = s.lines.find((l) => l.label === 'Venue hire');
  assert.ok(v.errors[venue?.id ?? '']);
});

test('reads amounts the way people type them, and refuses the rest', () => {
  assert.deepEqual(parseLineAmount(''), { ok: true, value: 0 });
  assert.deepEqual(parseLineAmount('1,250.50'), { ok: true, value: 125050 });
  assert.deepEqual(parseLineAmount('A$15'), { ok: true, value: 1500 });
  assert.deepEqual(parseLineAmount('NZ$3.30'), { ok: true, value: 330 });
  assert.deepEqual(parseLineAmount('$20'), { ok: true, value: 2000 });
  assert.equal(parseLineAmount('-5').ok, false);
  assert.equal(parseLineAmount('3.333').ok, false);
  assert.equal(parseLineAmount('20000000').ok, false);
  assert.deepEqual(parseCount('', 10), { ok: true, value: 0 });
  assert.deepEqual(parseCount(' 12 ', 100), { ok: true, value: 12 });
  assert.equal(parseCount('1.5', 100).ok, false);
  assert.equal(parseCount('101', 100).ok, false);
});

test('a per-participant line counts juniors or seniors only when its unit is per participant', () => {
  const s0 = initialState('other');
  const venue = s0.lines.find((l) => l.label === 'Venue hire');
  assert.ok(venue);
  // A per-day line set to "juniors only" by an earlier unit choice still multiplies by days.
  const s = updateLine(updateLine({ ...s0, days: '2', juniors: '5', seniors: '5' }, venue.id, { participants: 'junior' }), venue.id, {
    amount: '100',
  });
  const v = calculatorView(s);
  assert.ok(v.ok);
  if (!v.ok) return;
  assert.deepEqual(v.lines[venue.id], { total: 'A$200.00', working: '× 2 days' });
});

test('lines can be added and removed, with ids that never collide', () => {
  let s = initialState('carnival');
  const before = s.lines.length;
  s = addLine(s, 'expense');
  s = addLine(s, 'revenue');
  assert.equal(s.lines.length, before + 2);
  assert.equal(new Set(s.lines.map((l) => l.id)).size, s.lines.length);
  const added = s.lines.at(-1);
  assert.equal(added?.direction, 'revenue');
  s = removeLine(s, added?.id ?? '');
  assert.equal(s.lines.length, before + 1);
  s = addLine(s, 'revenue');
  assert.equal(new Set(s.lines.map((l) => l.id)).size, s.lines.length);
});

test('the working of each unit, in words', () => {
  const shape = { days: 1, teams: 1, juniors: 1, seniors: 2 };
  assert.equal(lineWorking({ unit: 'fixed', participants: 'all' }, shape), 'once');
  assert.equal(lineWorking({ unit: 'perDay', participants: 'all' }, shape), '× 1 day');
  assert.equal(lineWorking({ unit: 'perTeam', participants: 'all' }, shape), '× 1 team');
  assert.equal(lineWorking({ unit: 'perParticipant', participants: 'senior' }, shape), '× 2 seniors');
  assert.equal(lineWorking({ unit: 'perParticipantPerDay', participants: 'junior' }, shape), '× 1 junior × 1 day');
});

test('the break-even says what is missing, and how far short the entry is', () => {
  const shape = { days: 1, teams: 10, juniors: 100, seniors: 0 };
  assert.equal(breakEvenSentence({ kind: 'needs-shape', driver: 'teams', missing: 'teams' }, shape, false), 'Enter the number of teams to see where it breaks even.');
  assert.equal(
    breakEvenSentence({ kind: 'reached', driver: 'teams', count: 12 }, shape, false),
    'Breaks even at 12 teams, each bringing as many players as you entered. You have entered 10 teams: 2 teams short.',
  );
  assert.equal(
    breakEvenSentence({ kind: 'reached', driver: 'participants', count: 0 }, shape, false),
    'Fixed income already covers fixed costs, so it breaks even before the first entry.',
  );
});
