import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  byMonth,
  exportFileName,
  exportRows,
  filterFixtures,
  monthGrid,
  resultLabel,
  toCsv,
  toSpreadsheetXml,
  yearsOf,
  type CalendarFixture,
} from './competition-calendar.ts';

function f(playedOn: string, over: Partial<CalendarFixture> = {}): CalendarFixture {
  return {
    id: playedOn,
    teamId: 't1',
    teamName: 'U12 Academy',
    playedOn,
    kickOff: null,
    opponent: 'Rival United',
    homeAway: 'home',
    competition: null,
    venue: null,
    status: 'scheduled',
    goalsFor: null,
    goalsAgainst: null,
    ...over,
  };
}

describe('the competition calendar (scope 99)', () => {
  it('lists the calendar years with fixtures, newest first', () => {
    assert.deepEqual(yearsOf([f('2025-11-01'), f('2026-02-01'), f('2026-03-01')]), [2026, 2025]);
  });

  it('filters one year and one team, in date and kick-off order', () => {
    const list = filterFixtures(
      [f('2026-05-02', { kickOff: '10:00' }), f('2026-05-02', { kickOff: '08:30' }), f('2025-05-02'), f('2026-01-10', { teamId: 't2' })],
      2026,
      't1',
    );
    assert.deepEqual(list.map((x) => `${x.playedOn} ${x.kickOff}`), ['2026-05-02 08:30', '2026-05-02 10:00']);
    assert.equal(filterFixtures([f('2026-01-10', { teamId: 't2' })], 2026, null).length, 1);
  });

  it('groups by month, only the months that have games', () => {
    const months = byMonth([f('2026-05-02'), f('2026-03-01'), f('2026-05-09')]);
    assert.deepEqual(months.map((m) => [m.label, m.fixtures.length]), [['March', 1], ['May', 2]]);
  });

  it('draws a Monday-first month', () => {
    // 1 October 2026 is a Thursday.
    const weeks = monthGrid(2026, 9);
    assert.deepEqual(weeks[0], [null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    assert.equal(weeks.flat().filter(Boolean).length, 31);
    assert.ok(weeks.every((w) => w.length === 7));
  });

  it('reads a result as score and outcome, or the status', () => {
    assert.equal(resultLabel({ status: 'played', goalsFor: 2, goalsAgainst: 1 }), '2–1 W');
    assert.equal(resultLabel({ status: 'played', goalsFor: 0, goalsAgainst: 0 }), '0–0 D');
    assert.equal(resultLabel({ status: 'cancelled', goalsFor: null, goalsAgainst: null }), 'Cancelled');
    assert.equal(resultLabel({ status: 'scheduled', goalsFor: null, goalsAgainst: null }), '');
  });

  it('CSV quotes what needs quoting and never lets a cell be a formula', () => {
    const csv = toCsv([['a', 'b,c'], ['=SUM(A1)', 'say "hi"']]);
    assert.equal(csv, 'a,"b,c"\r\n\'=SUM(A1),"say ""hi"""\r\n');
  });

  it('SpreadsheetML escapes every value and keeps every cell a string', () => {
    const out = toSpreadsheetXml(exportRows([f('2026-05-02', { opponent: 'Tom & Jerry <FC>' })]), 'U12/Academy');
    assert.ok(out.includes('Tom &amp; Jerry &lt;FC&gt;'));
    assert.ok(out.includes('ss:Name="U12 Academy"'));
    assert.ok(!out.includes('ss:Type="Number"'));
    assert.ok(out.includes('<Cell ss:StyleID="h"><Data ss:Type="String">Date</Data></Cell>'));
  });

  it('names the file safely', () => {
    assert.equal(exportFileName('North Star FC', 2026, 'U12 Academy'), 'north-star-fc-2026-u12-academy-fixtures');
    assert.equal(exportFileName('Cúcuta Deportivo', 2026, null), 'cucuta-deportivo-2026-fixtures');
  });
});
