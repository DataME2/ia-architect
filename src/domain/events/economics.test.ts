/**
 * BR209's figures, checked against events worked by hand.
 *
 * Each break-even below was also checked one count either side, in the
 * comment beside it, because a break-even that is off by one is the error
 * this function exists to prevent.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { breakEven, eventEconomics, lineMultiplier, scaleShape, type BudgetLine, type EventShape } from './economics.ts';

const income = (label: string, amountCents: number, unit: BudgetLine['unit'], extra: Partial<BudgetLine> = {}): BudgetLine =>
  ({ label, direction: 'revenue', category: 'entry-fees', unit, participants: 'all', amountCents, basis: 'assumption', ...extra }) as BudgetLine;
const cost = (label: string, amountCents: number, unit: BudgetLine['unit'], extra: Partial<BudgetLine> = {}): BudgetLine =>
  ({ label, direction: 'expense', category: 'other', unit, participants: 'all', amountCents, basis: 'assumption', ...extra }) as BudgetLine;

// A three-day holiday clinic for thirty juniors, charged A$45 a day.
const clinic: readonly BudgetLine[] = [
  income('Participant fees', 4500, 'perParticipantPerDay'),
  cost('Venue hire', 30000, 'perDay', { category: 'venue' }),
  cost('Coaches', 40000, 'perDay', { category: 'coaching' }),
  cost('Equipment', 20000, 'fixed', { category: 'equipment' }),
  cost('Participant kit', 1500, 'perParticipant', { category: 'equipment' }),
  cost('Governing-body charge — juniors', 330, 'perParticipant', { category: 'sanctioning', participants: 'junior' }),
];
const clinicShape: EventShape = { days: 3, teams: 0, juniors: 30, seniors: 0 };

test('a holiday clinic: income, costs and surplus from per-day and per-participant lines', () => {
  const f = eventEconomics(clinic, clinicShape, 'participants', 'AUD');
  assert.equal(f.revenueCents, 405000); // 4500 × 30 × 3
  assert.equal(f.costCents, 284900); // 90000 + 120000 + 20000 + 45000 + 9900
  assert.equal(f.surplusCents, 120100);
  assert.deepEqual(f.lineTotals, [405000, 90000, 120000, 20000, 45000, 9900]);
  assert.deepEqual(f.perParticipant, { revenueCents: 13500, costCents: 9497 }); // 9496.67 rounds to 9497
});

test('a holiday clinic breaks even at 20 participants', () => {
  // 19: 256500 in, 264770 out (−8270). 20: 270000 in, 266600 out (+3400).
  assert.deepEqual(breakEven(clinic, clinicShape, 'participants'), { kind: 'reached', driver: 'participants', count: 20 });
});

// A one-day carnival of forty teams of ten juniors, charged per team.
const carnival = (entryPerTeam: number): BudgetLine[] => [
  income('Team entry fees', entryPerTeam, 'perTeam'),
  income('Sponsorship', 50000, 'fixed', { category: 'sponsorship' }),
  cost('Venue hire', 100000, 'perDay', { category: 'venue' }),
  cost('Referees', 6000, 'perTeam', { category: 'referees' }),
  cost('First aid', 30000, 'perDay'),
  cost('Medals', 500, 'perParticipant', { category: 'equipment' }),
  cost('Insurance', 40000, 'fixed', { category: 'insurance' }),
  cost('Governing-body charge — juniors', 1500, 'perParticipant', { category: 'sanctioning', participants: 'junior' }),
];
const carnivalShape: EventShape = { days: 1, teams: 40, juniors: 400, seniors: 0 };

test('a carnival that loses money on every extra team cannot break even by growing', () => {
  const f = eventEconomics(carnival(25000), carnivalShape, 'teams', 'AUD');
  assert.equal(f.revenueCents, 1050000);
  assert.equal(f.costCents, 1210000);
  assert.equal(f.surplusCents, -160000);
  // Each team: 25000 in, 6000 + 10 × (500 + 1500) out — 1000 lost per team.
  assert.deepEqual(f.breakEven, { kind: 'not-reachable', driver: 'teams' });
});

test('the same carnival at A$300 a team breaks even at exactly 30 teams', () => {
  // 29 teams: 920000 in, 924000 out. 30 teams: 950000 in, 950000 out.
  assert.deepEqual(breakEven(carnival(30000), carnivalShape, 'teams'), { kind: 'reached', driver: 'teams', count: 30 });
});

test('juniors and seniors charged differently keep their proportion as the count grows', () => {
  const lines = [
    income('Fees', 2000, 'perParticipant'),
    cost('Fixed costs', 10000, 'fixed'),
    cost('Charge — juniors', 1500, 'perParticipant', { participants: 'junior' }),
    cost('Charge — seniors', 2000, 'perParticipant', { participants: 'senior' }),
  ];
  // Three juniors to one senior: 375 cents per participant on average,
  // so 26 participants make 9750 and 27 make 10125 against 10000.
  assert.deepEqual(breakEven(lines, { days: 1, teams: 0, juniors: 3, seniors: 1 }, 'participants'), {
    kind: 'reached',
    driver: 'participants',
    count: 27,
  });
});

test('fixed income that already covers fixed costs breaks even at zero', () => {
  const lines = [income('Grant', 50000, 'fixed', { category: 'other-income' }), cost('Venue', 40000, 'fixed'), income('Fees', 100, 'perParticipant')];
  assert.deepEqual(breakEven(lines, clinicShape, 'participants'), { kind: 'reached', driver: 'participants', count: 0 });
});

test('says what is missing instead of guessing it', () => {
  const split = [income('Fees', 1000, 'perParticipant'), cost('Venue', 5000, 'fixed'), cost('Charge — juniors', 100, 'perParticipant', { participants: 'junior' })];
  assert.deepEqual(breakEven(split, { days: 1, teams: 0, juniors: 0, seniors: 0 }, 'participants'), {
    kind: 'needs-shape',
    driver: 'participants',
    missing: 'participants',
  });
  assert.deepEqual(breakEven(carnival(30000), { ...carnivalShape, teams: 0 }, 'teams'), {
    kind: 'needs-shape',
    driver: 'teams',
    missing: 'teams',
  });
});

test('with nobody entered yet, a flat per-participant fee still gives a break-even', () => {
  const lines = [income('Fees', 1000, 'perParticipant'), cost('Venue', 5000, 'fixed')];
  const f = eventEconomics(lines, { days: 1, teams: 0, juniors: 0, seniors: 0 }, 'participants', 'NZD');
  assert.equal(f.perParticipant, null);
  assert.deepEqual(f.breakEven, { kind: 'reached', driver: 'participants', count: 5 });
  assert.equal(f.currency, 'NZD');
});

test('costs by category drop empty categories and list the largest first', () => {
  const f = eventEconomics(carnival(30000), carnivalShape, 'teams', 'AUD');
  assert.deepEqual(
    f.costByCategory.map((c) => c.category),
    ['sanctioning', 'referees', 'equipment', 'venue', 'insurance', 'other'],
  );
  assert.deepEqual(f.revenueByCategory, [
    { category: 'entry-fees', cents: 1200000 },
    { category: 'sponsorship', cents: 50000 },
  ]);
});

test('a figure is only as strong as its weakest input (BR208)', () => {
  const published = cost('Charge', 330, 'perParticipant', { basis: 'published-policy' });
  const assumed = cost('Venue', 1000, 'fixed', { basis: 'assumption' });
  assert.equal(eventEconomics([published], clinicShape, 'participants', 'AUD').basis, 'published-policy');
  assert.equal(eventEconomics([published, assumed], clinicShape, 'participants', 'AUD').basis, 'assumption');
  // A line with nothing in it does not weaken the figure.
  assert.equal(eventEconomics([published, { ...assumed, amountCents: 0 }], clinicShape, 'participants', 'AUD').basis, 'published-policy');
  assert.equal(eventEconomics([], clinicShape, 'participants', 'AUD').basis, 'assumption');
});

test('the order of the lines does not change the answer', () => {
  const a = eventEconomics(clinic, clinicShape, 'participants', 'AUD');
  const b = eventEconomics([...clinic].reverse(), clinicShape, 'participants', 'AUD');
  assert.equal(a.surplusCents, b.surplusCents);
  assert.deepEqual(a.breakEven, b.breakEven);
  assert.deepEqual(a.costByCategory, b.costByCategory);
});

test('refuses fractions of a cent, negative amounts and negative counts', () => {
  assert.throws(() => eventEconomics([income('Fees', 10.5, 'fixed')], clinicShape, 'participants', 'AUD'), RangeError);
  assert.throws(() => eventEconomics([cost('Venue', -100, 'fixed')], clinicShape, 'participants', 'AUD'), RangeError);
  assert.throws(() => eventEconomics([], { ...clinicShape, days: -1 }, 'participants', 'AUD'), RangeError);
  assert.throws(() => eventEconomics([], { ...clinicShape, juniors: 2.5 }, 'participants', 'AUD'), RangeError);
});

test('each unit multiplies by what it says', () => {
  const shape: EventShape = { days: 2, teams: 5, juniors: 7, seniors: 3 };
  assert.equal(lineMultiplier({ unit: 'fixed', participants: 'all' }, shape), 1);
  assert.equal(lineMultiplier({ unit: 'perDay', participants: 'all' }, shape), 2);
  assert.equal(lineMultiplier({ unit: 'perTeam', participants: 'all' }, shape), 5);
  assert.equal(lineMultiplier({ unit: 'perParticipant', participants: 'all' }, shape), 10);
  assert.equal(lineMultiplier({ unit: 'perParticipant', participants: 'senior' }, shape), 3);
  assert.equal(lineMultiplier({ unit: 'perParticipantPerDay', participants: 'junior' }, shape), 14);
});

test('a scenario scales the break-even count and never the days', () => {
  assert.deepEqual(scaleShape({ days: 3, teams: 0, juniors: 30, seniors: 5 }, 'participants', -20), {
    days: 3,
    teams: 0,
    juniors: 24,
    seniors: 4,
  });
  assert.deepEqual(scaleShape(carnivalShape, 'teams', 20), { days: 1, teams: 48, juniors: 480, seniors: 0 });
  assert.deepEqual(scaleShape({ days: 1, teams: 1, juniors: 1, seniors: 0 }, 'teams', -100), {
    days: 1,
    teams: 0,
    juniors: 0,
    seniors: 0,
  });
});
