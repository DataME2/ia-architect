import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  billsPage, collectionRate, compactCents, componentRows, delta, monthColumns, monthLabel, niceTicks,
  parseTeamSort, pickSeason, previousSeason, seasonBars, sortTeams, type FinanceSeason, type FinanceTeam,
} from './finance-report.ts';

const season = (name: string, startsOn: string, over: Partial<FinanceSeason> = {}): FinanceSeason => ({
  id: name, name, startsOn, endsOn: startsOn.replace('-01-01', '-12-31'), imported: true,
  invoiced: 0, collected: 0, outstanding: 0, credits: 0, bills: 0, owing: 0,
  components: {}, months: [], teams: [], ...over,
});

const s24 = season('2024', '2024-01-01', { invoiced: 584_930_00, collected: 583_960_00, outstanding: 970_00, bills: 795 });
const s25 = season('2025', '2025-01-01', { invoiced: 654_532_00, collected: 641_988_50, outstanding: 12_543_50, bills: 667 });
const s27 = season('Season 2027', '2026-11-01');

test('the season shown', async (t) => {
  await t.test('is the one asked for', () => assert.equal(pickSeason([s24, s25, s27], '2024')?.name, '2024'));
  await t.test('else the latest that billed anything, not an empty one just created', () =>
    assert.equal(pickSeason([s24, s25, s27], undefined)?.name, '2025'));
  await t.test('else the latest, and nothing when there is none', () => {
    assert.equal(pickSeason([s27], undefined)?.name, 'Season 2027');
    assert.equal(pickSeason([], undefined), null);
  });
  await t.test('is compared with the season before it that billed', () => {
    assert.equal(previousSeason([s24, s25, s27], s25)?.name, '2024');
    assert.equal(previousSeason([s24, s25, s27], s24), null);
  });
});

test('the figures say what changed, and which way is good news', async (t) => {
  await t.test('a collection rate over what was billed', () => {
    assert.equal(collectionRate(80, 100), 0.8);
    assert.equal(collectionRate(0, 0), null);
  });
  await t.test('more collected is good, more outstanding is not', () => {
    assert.deepEqual(delta(110, 100, true), { text: '+10.0%', tone: 'good' });
    assert.deepEqual(delta(110, 100, false), { text: '+10.0%', tone: 'bad' });
    assert.deepEqual(delta(90, 100, false), { text: '−10.0%', tone: 'good' });
  });
  await t.test('nothing to compare with says nothing', () => {
    assert.equal(delta(5, null, true), null);
    assert.equal(delta(5, 0, true), null);
  });
  await t.test('compact amounts for axes and bar ends', () => {
    assert.equal(compactCents(970_00), '$970');
    assert.equal(compactCents(12_543_50), '$12.5K');
    assert.equal(compactCents(584_930_00), '$585K');
    assert.equal(compactCents(1_250_000_00), '$1.3M');
    assert.equal(compactCents(-50_00), '−$50');
  });
});

test('the charts', async (t) => {
  await t.test('each season is a share of the widest, collected then outstanding', () => {
    const width = seasonBars([s24, s25]).map((b) => b.collectedPct + b.outstandingPct);
    assert.ok(Math.abs((width[1] ?? 0) - 100) < 1e-9);
    assert.ok((width[0] ?? 100) < 100);
  });
  await t.test('a bill is made of its charges, largest first, the discount last as a reduction', () => {
    const rows = componentRows({ club: 500_00, discount: -50_00, levy: 50_00, governing: 100_00, adjustment: 0 });
    assert.deepEqual(rows.map((r) => r.key), ['club', 'governing', 'levy', 'discount']);
    assert.equal(rows.at(-1)?.reduces, true);
    assert.equal(rows[0]?.pct, 100);
    assert.equal(rows.at(-1)?.pct, 10);
  });
  await t.test('round axis stops, and columns as shares of the top one', () => {
    assert.deepEqual(niceTicks(180_000_00), [0, 50_000_00, 100_000_00, 150_000_00, 200_000_00]);
    assert.deepEqual(niceTicks(0), [0]);
    const { columns, ticks } = monthColumns([{ month: '2025-10', cents: 100_00, count: 3 }, { month: '2025-11', cents: 50_00, count: 1 }]);
    assert.equal(ticks.at(-1), 100_00);
    assert.deepEqual(columns.map((c) => [c.label, c.heightPct]), [['Oct 2025', 100], ['Nov 2025', 50]]);
  });
  await t.test('months read as people say them', () => assert.equal(monthLabel('2026-01'), 'Jan 2026'));
});

test('the teams and the bills', async (t) => {
  const team = (name: string, outstanding: number, invoiced = 1000, collected = invoiced - outstanding): FinanceTeam =>
    ({ team: name, category: null, players: 10, invoiced, collected, outstanding });
  const teams = [team('No team', 900), team('U8 Red', 100), team('U10 Blue', 300, 2000)];
  await t.test('sorted by a figure, largest first, with No team last', () =>
    assert.deepEqual(sortTeams(teams, 'outstanding').map((x) => x.team), ['U10 Blue', 'U8 Red', 'No team']));
  await t.test('sorted by name, A to Z', () =>
    assert.deepEqual(sortTeams(teams, 'team').map((x) => x.team), ['U10 Blue', 'U8 Red', 'No team']));
  await t.test('sorted by collection rate', () =>
    assert.deepEqual(sortTeams(teams, 'rate').map((x) => x.team), ['U8 Red', 'U10 Blue', 'No team']));
  await t.test('an unknown sort is the balance', () => assert.equal(parseTeamSort('drop table'), 'outstanding'));
  await t.test('a page within what exists', () => {
    assert.equal(billsPage('3', 60), 3);
    assert.equal(billsPage('9', 60), 3);
    assert.equal(billsPage('x', 60), 1);
    assert.equal(billsPage(undefined, 0), 1);
  });
});
