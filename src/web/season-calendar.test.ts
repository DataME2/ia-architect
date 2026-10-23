import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FQ_2027_SEQ as cal } from './season-calendar-fq-2027.ts';
import { FQ_2027_SOUTH_COAST as soc } from './season-calendar-fq-2027-south-coast.ts';
import {
  journeyOf,
  keyDatesIn,
  monthsOf,
  playDate,
  pulse,
  readCell,
  slotsOn,
  weekendLabel,
  weekendsOf,
} from './season-calendar.ts';
import { CALENDARS, FEDERATIONS, byConference, calendarById } from './season-calendars.ts';

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
    assert.deepEqual(readCell('Foundation 1&2').map((e) => [e.text, e.short]), [['Foundation rounds 1 & 2', 'F1–2']]);
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

describe('the FQ 2027 South Coast transcription matches the PDF (scope 103)', () => {
  const comp = (id: string) => {
    const c = soc.competitions.find((x) => x.id === id);
    assert.ok(c, id);
    return c;
  };
  const fridays = new Set(weekendsOf(soc).map((w) => w.friday));

  it('puts every cell on one of the 44 Fridays, and reads every one', () => {
    for (const c of soc.competitions) {
      for (const [f, raw] of Object.entries(c.plan)) {
        assert.ok(fridays.has(f), `${c.id} ${f}`);
        assert.ok(readCell(raw).length > 0, `${c.id} ${f} ${raw}`);
      }
    }
    assert.equal(soc.competitions.length, 15);
  });

  it('plays the rounds its notes promise, except where the PDF contradicts itself (#92, #93)', () => {
    const contradicted = new Set(['juniors-5-6-teams', 'juniors-7-8-teams', 'seniors-11-12-teams']);
    for (const c of soc.competitions) {
      const promised = /(\d+) Rounds/.exec(c.notes ?? '');
      if (promised && !contradicted.has(c.id)) assert.equal(journeyOf(c).rounds, Number(promised[1]), c.id);
    }
    // The names are right and the notes column is not: 15 and 14, as named.
    assert.equal(journeyOf(comp('juniors-5-6-teams')).rounds, 15);
    assert.equal(journeyOf(comp('juniors-7-8-teams')).rounds, 14);
    // Round 11, a catch-up, then round 13: no round 12, as printed.
    assert.equal(journeyOf(comp('seniors-11-12-teams')).rounds, 21);
    assert.equal(comp('seniors-11-12-teams').plan['2027-06-11'], '13');
    assert.equal(journeyOf(comp('miniroos-u6-u12')).rounds, 18);
  });

  it('dates the community seniors to the Wednesday printed above them', () => {
    const s = comp('seniors-5-6-teams');
    assert.equal(s.playedOn, 'Wednesday');
    assert.equal(journeyOf(s).firstRound, '2027-03-05');
    assert.equal(playDate(s, '2027-03-05'), '2027-03-03');
    assert.equal(playDate(s, '2027-01-15'), '2027-01-13');
    assert.equal(playDate(comp('qpl-7-8-teams'), '2027-03-05'), '2027-03-05');
  });

  it('rests at Easter, and marks the NSW school holidays beside Queensland’s', () => {
    const easter = slotsOn(soc, '2027-03-26', null);
    assert.equal(easter.weekend.length + easter.midweek.length, 0);
    const april = weekendsOf(soc).filter((w) => w.friday.startsWith('2027-04'));
    assert.deepEqual(april.filter((w) => w.otherHoliday).map((w) => w.friday), ['2027-04-09', '2027-04-16', '2027-04-23']);
    assert.ok(april.find((w) => w.friday === '2027-04-09')?.schoolHoliday);
    assert.equal(weekendsOf(cal).find((w) => w.friday === '2027-04-16')?.otherHoliday, null);
  });

  it('shares FQ’s statewide carnivals with the SEQ calendar, and prints no registration windows', () => {
    assert.equal(soc.events, cal.events);
    assert.equal(soc.windows.length, 0);
  });
});

describe('every FQ 2027 region, transcribed as printed (scope 103)', () => {
  // Rows whose own notes disagree with their grid, kept as printed (open questions #92, #93, #97).
  const CONTRADICTED = new Set([
    'fq-2027-seq-south-coast/juniors-5-6-teams',
    'fq-2027-seq-south-coast/juniors-7-8-teams',
    'fq-2027-seq-south-coast/seniors-11-12-teams',
    'fq-2027-seq-darling-downs/seniors-11-12-teams',
    'fq-2027-seq-darling-downs/miniroos-u6-u12',
    'fq-2027-seq-sunshine-coast/miniroos-sunshine-coast',
    'fq-2027-seq-sunshine-coast/community-juniors-u12',
    'fq-2027-central-wide-bay/community-juniors-9-10-teams',
    'fq-2027-central-wide-bay/community-juniors-7-8-teams',
    'fq-2027-central-central-coast/jpl-juniors-9-10-teams',
    'fq-2027-central-central-coast/jpl-juniors-5-6-teams',
    'fq-2027-central-central-coast/jpl-juniors-7-8-teams',
    'fq-2027-northern-northern/miniroos',
    'fq-2027-northern-northern/community-juniors-u12',
    'fq-2027-northern-far-north/miniroos-tablelands',
    'fq-2027-northern-far-north/miniroos-johnstone-river',
  ]);

  it('gives every Queensland region its calendar, named by its conference', () => {
    const fq = FEDERATIONS.find((f) => f.state === 'QLD');
    assert.equal(fq?.regions.length, 10);
    for (const r of fq?.regions ?? []) assert.ok(r.calendar && calendarById(r.calendar), r.name);
    for (const c of CALENDARS) assert.match(c.region, /^(SEQ|Central|Northern) Conference — /, c.id);
    assert.deepEqual(byConference(fq?.regions ?? []).map((g) => [g.conference, g.regions.length]), [
      ['SEQ Conference', 4], ['Central Conference', 2], ['Northern Conference', 4],
    ]);
    assert.deepEqual(byConference(FEDERATIONS[1]?.regions ?? []), []);
  });

  it('puts every cell on one of the calendar’s Fridays, and reads every one', () => {
    for (const c of CALENDARS) {
      const fridays = new Set(weekendsOf(c).map((w) => w.friday));
      for (const comp of c.competitions) {
        assert.equal(new Set(c.competitions.map((x) => x.id)).size, c.competitions.length, c.id);
        for (const [f, raw] of Object.entries(comp.plan)) {
          assert.ok(fridays.has(f), `${c.id} ${comp.id} ${f}`);
          assert.ok(readCell(raw).length > 0, `${c.id} ${comp.id} ${raw}`);
        }
      }
    }
  });

  it('plays what each row’s notes promise, except the rows the PDF contradicts', () => {
    const found: string[] = [];
    for (const c of CALENDARS) {
      for (const comp of c.competitions) {
        const promised = /(\d+) Rounds/.exec(comp.notes ?? '');
        if (promised && journeyOf(comp).rounds !== Number(promised[1])) found.push(`${c.id}/${comp.id}`);
      }
    }
    assert.deepEqual(found.sort(), [...CONTRADICTED].sort());
  });

  it('plays no fixture on a weekend the calendar rests', () => {
    const played = new Set(['round', 'catch-up', 'finals', 'play-off']);
    for (const c of CALENDARS) {
      for (const f of Object.keys(c.noGames)) {
        const { weekend, midweek } = slotsOn(c, f, null);
        assert.deepEqual([...weekend, ...midweek].filter((s) => played.has(s.entry.kind)).map((s) => s.competition.id), [], `${c.id} ${f}`);
      }
    }
  });

  it('runs the Gulf to Christmas, and fills a label printed across several weeks', () => {
    const gulf = calendarById('fq-2027-northern-gulf');
    assert.equal(gulf?.weekendCount, 52);
    assert.equal(gulf?.competitions.find((x) => x.id === 'futsal')?.plan['2027-12-10'], 'GF');
    assert.equal(gulf?.noGames['2027-08-06'], 'Mount Isa Rodeo');
    const girls = calendarById('fq-2027-northern-northern')?.competitions.find((x) => x.id === 'girls-united');
    assert.equal(Object.values(girls?.plan ?? {}).filter((v) => v === 'Term 2 League').length, 10);
    const rep = calendarById('fq-2027-central-central-coast')?.competitions.find((x) => x.id === 'representative-carnivals-matches');
    assert.deepEqual([rep?.plan['2027-06-25'], rep?.plan['2027-07-02'], rep?.plan['2027-07-09']], ['Sunny', 'Moreton Bay', 'Moreton Bay']);
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
