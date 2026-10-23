import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FQ_2027_SEQ as cal } from './season-calendar-fq-2027.ts';
import {
  journeyOf,
  keyDatesIn,
  monthsOf,
  pulse,
  readCell,
  slotsOn,
  weekendLabel,
  weekendsOf,
} from './season-calendar.ts';
import { CALENDARS, FEDERATIONS, calendarById } from './season-calendars.ts';

const byId = (id: string) => {
  const c = cal.competitions.find((x) => x.id === id);
  assert.ok(c, id);
  return c;
};

describe('reading a printed cell (scope 101)', () => {
  it('splits a weekend round from the midweek one printed beside it', () => {
    assert.deepEqual(readCell('3 & 4 (MW)').map((e) => [e.text, e.midweek]), [['Round 3', false], ['Round 4', true]]);
    assert.deepEqual(readCell('20(MW)&21').map((e) => [e.text, e.midweek]), [['Round 21', false], ['Round 20', true]]);
    assert.deepEqual(readCell('7&8').map((e) => [e.text, e.short]), [['Rounds 7 & 8', 'R7–8']]);
  });

  it('names every stage in words, and keeps the chip short', () => {
    assert.deepEqual(readCell('GF')[0], { kind: 'finals', text: 'Grand final', short: 'GF', midweek: false });
    assert.equal(readCell('SF (MW)')[0]?.midweek, true);
    assert.equal(readCell('CU')[0]?.kind, 'catch-up');
    assert.equal(readCell('Foundation 3')[0]?.text, 'Foundation round 3');
    assert.equal(readCell('NOMS CLOSE')[0]?.text, 'Nominations close');
  });
});

describe('the FQ 2027 SEQ transcription matches the PDF', () => {
  const fridays = new Set(weekendsOf(cal).map((w) => w.friday));

  it('puts every cell on one of the 44 weekends, each a Friday', () => {
    assert.equal(fridays.size, 44);
    for (const f of fridays) assert.equal(new Date(`${f}T00:00:00Z`).getUTCDay(), 5, f);
    for (const c of cal.competitions) for (const f of Object.keys(c.plan)) assert.ok(fridays.has(f), `${c.id} ${f}`);
  });

  it('gives every competition the number of rounds its notes promise', () => {
    for (const c of cal.competitions) {
      const promised = /(\d+) Rounds/.exec(c.notes ?? '');
      if (promised) assert.equal(journeyOf(c).rounds, Number(promised[1]), c.id);
    }
    // Double round robins: twelve teams play 22 rounds, ten play 18.
    assert.equal(journeyOf(byId('npl-men')).rounds, 22);
    assert.equal(journeyOf(byId('qpl-6-metro-men')).rounds, 18);
    assert.equal(journeyOf(byId('qpl-3-metro-men')).rounds, 26);
  });

  it('plays nothing on the Easter weekend', () => {
    const easter = slotsOn(cal, '2027-03-26', null);
    assert.equal(easter.weekend.length + easter.midweek.length, 0);
    assert.equal(weekendsOf(cal).find((w) => w.friday === '2027-03-26')?.noGames, 'Easter');
  });

  it('starts the NPL Men on 19 February and finishes it on 10 September', () => {
    const j = journeyOf(byId('npl-men'));
    assert.equal(j.firstRound, '2027-02-19');
    assert.equal(j.grandFinal, '2027-09-10');
    assert.equal(j.catchUps, 4);
  });
});

describe('the season, month by month', () => {
  it('keeps a weekend in the month of its Friday', () => {
    const months = monthsOf(cal);
    assert.deepEqual(months.map((m) => m.weekends.length), [5, 4, 4, 5, 4, 4, 5, 4, 4, 5]);
    assert.equal(months[3]?.weekends.at(-1)?.label, 'Fri 30 Apr – Sun 2 May');
    assert.equal(weekendLabel('2027-03-05'), 'Fri 5 – Sun 7 Mar');
  });

  it('feels the season: quiet in the January holidays, busiest in winter', () => {
    const p = pulse(cal, null);
    assert.ok((p[0] ?? 0) <= 1, `1 Jan: ${p[0]}`);
    assert.ok(Math.max(...p) >= 25);
    assert.equal(pulse(cal, new Set(['miniroos'])).filter((n) => n > 0).length, 18);
  });

  it('lists the carnivals and windows that touch a month', () => {
    const april = keyDatesIn(cal, 3).map((k) => k.name);
    assert.ok(april.includes('FQ Academy U9–U16 Inter-Conference Carnival'));
    assert.ok(april.includes('Women’s professional registration window'));
    assert.ok(!april.includes('Junior Cup — U12–U13 Boys & Girls'));
  });
});

describe('where calendars live', () => {
  it('names every federation once, and every calendar a region points at exists', () => {
    assert.equal(new Set(FEDERATIONS.map((f) => f.name)).size, 9);
    for (const r of FEDERATIONS.flatMap((f) => f.regions)) if (r.calendar) assert.ok(calendarById(r.calendar), r.name);
    assert.equal(new Set(CALENDARS.map((c) => c.id)).size, CALENDARS.length);
  });
});
