import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SCALES,
  atFarEnd,
  checkInConsentText,
  daysOf,
  entriesMade,
  followUpLine,
  followUps,
  parseScores,
  parseSession,
  rpeLabel,
  scoresLine,
  sessionLine,
  sessionsByDay,
  teamAverages,
  whoSeesLine,
  type WellbeingEntry,
} from './check-in.ts';

const day = (personId: string, on: string, s: Partial<Record<string, number>> = {}): WellbeingEntry => ({
  personId,
  on,
  motivation: 7,
  mood: 7,
  sleep_quality: 7,
  stress: 3,
  soreness: 3,
  ...s,
});

describe('the scales', () => {
  it('keeps the club’s five measures and their end labels', () => {
    assert.deepEqual(
      SCALES.map((s) => `${s.label}: 1 ${s.low} / 10 ${s.high}`),
      [
        'Motivation: 1 None / 10 Highly',
        'Mood: 1 Low quality / 10 High quality',
        'Sleep quality: 1 No sleep / 10 Well rested',
        'Stress: 1 No stress / 10 Highly anxious or stressed',
        'Soreness: 1 No soreness / 10 High level of pain',
      ],
    );
  });

  it('words RPE as CR-10 does, from 1', () => {
    assert.equal(rpeLabel(4), '4 · Somewhat hard');
    assert.equal(rpeLabel(7), '7 · Very hard');
    assert.equal(rpeLabel(10), '10 · Maximal');
    assert.equal(sessionLine({ kind: 'team_training', rpe: 7 }), 'Team training · RPE 7 · Very hard');
  });
});

describe('parseScores', () => {
  const all = [['motivation', '7'], ['mood', '6'], ['sleep_quality', '5'], ['stress', '3'], ['soreness', '8']] as const;

  it('takes five whole numbers from 1 to 10', () => {
    const parsed = parseScores(all);
    assert.ok(parsed.ok);
    assert.equal(scoresLine(parsed.scores), 'Motivation 7 · Mood 6 · Sleep quality 5 · Stress 3 · Soreness 8');
  });

  it('names the scale left unanswered or out of range', () => {
    const missing = parseScores(all.filter(([k]) => k !== 'stress'));
    assert.deepEqual(missing, { ok: false, message: 'Choose a number from 1 to 10 for stress.' });
    assert.equal(parseScores([...all.slice(0, 4), ['soreness', '11']]).ok, false);
    assert.equal(parseScores([...all.slice(0, 4), ['soreness', '0']]).ok, false);
  });
});

describe('parseSession', () => {
  it('takes a session up to seven days back, never ahead', () => {
    assert.deepEqual(parseSession({ on: '2026-10-25', kind: 'gym', rpe: '4' }, '2026-10-25'), {
      ok: true,
      on: '2026-10-25',
      kind: 'gym',
      rpe: 4,
    });
    assert.equal(parseSession({ on: '2026-10-18', kind: 'gym', rpe: '4' }, '2026-10-25').ok, true);
    assert.equal(parseSession({ on: '2026-10-17', kind: 'gym', rpe: '4' }, '2026-10-25').ok, false);
    assert.equal(parseSession({ on: '2026-10-26', kind: 'gym', rpe: '4' }, '2026-10-25').ok, false);
    assert.equal(parseSession({ on: '2026-10-25', kind: 'yoga', rpe: '4' }, '2026-10-25').ok, false);
    assert.equal(parseSession({ on: '2026-10-25', kind: 'gym', rpe: '' }, '2026-10-25').ok, false);
  });
});

describe('consent wording', () => {
  it('speaks to the guardian about their child, and to an adult about themselves', () => {
    const guardian = checkInConsentText({ club: 'North Star FC', player: 'Mia', self: false });
    assert.equal(guardian.agree, 'I agree to Mia completing the daily check-in');
    assert.match(guardian.paragraphs[1] ?? '', /^Who sees it: Mia, you, the coaches of Mia’s teams/);
    const adult = checkInConsentText({ club: 'North Star FC', player: 'Alex', self: true });
    assert.equal(adult.agree, 'I agree to complete the daily check-in');
    assert.match(adult.paragraphs[4] ?? '', /on this page/);
  });

  it('says who reads it and whose agreement it rests on', () => {
    assert.equal(
      whoSeesLine({ adult: false, consentedOn: '2026-10-03', bySelf: false }),
      "Seen by your team's coaches, the Technical Leads and your guardian. Not by teammates or the team manager. Your guardian agreed to this on Sat 3 Oct.",
    );
    assert.match(whoSeesLine({ adult: true, consentedOn: '2026-10-03', bySelf: true }), /You agreed to this/);
  });
});

describe('teamAverages', () => {
  it('averages each measure over the range, and day by day', () => {
    const avgs = teamAverages(
      [day('a', '2026-10-19', { motivation: 8 }), day('b', '2026-10-19', { motivation: 5 }), day('a', '2026-10-21', { motivation: 6 }), day('a', '2026-10-30', { motivation: 1 })],
      '2026-10-19',
      '2026-10-21',
    );
    const motivation = avgs.find((a) => a.scale.key === 'motivation');
    assert.equal(motivation?.average, 6.3);
    assert.deepEqual(motivation?.byDay, [6.5, null, 6]);
    assert.equal(teamAverages([], '2026-10-19', '2026-10-19')[0]?.average, null);
  });
});

describe('entriesMade', () => {
  it('asks only from consent and up to today', () => {
    const rows = entriesMade({
      players: [
        { personId: 'a', consentedOn: '2026-10-01' },
        { personId: 'b', consentedOn: '2026-10-23' },
        { personId: 'c', consentedOn: null },
      ],
      wellbeing: [day('a', '2026-10-19'), day('a', '2026-10-20'), day('b', '2026-10-23')],
      sessions: [{ id: 's1', personId: 'a', on: '2026-10-20', kind: 'gym', rpe: 4 }],
      from: '2026-10-19',
      to: '2026-10-25',
      today: '2026-10-24',
    });
    assert.deepEqual(rows, [
      { personId: 'a', asked: 6, checkedIn: 2, sessions: 1 },
      { personId: 'b', asked: 2, checkedIn: 1, sessions: 0 },
      { personId: 'c', asked: 0, checkedIn: 0, sessions: 0 },
    ]);
  });
});

describe('followUps', () => {
  it('lists far-end answers, latest first, with how many days running (BR187)', () => {
    const list = followUps(
      [
        day('t', '2026-10-23', { soreness: 9 }),
        day('t', '2026-10-24', { soreness: 10 }),
        day('m', '2026-10-24', { sleep_quality: 2 }),
        day('k', '2026-10-21', { mood: 1 }),
        day('k', '2026-10-24', { stress: 8 }),
      ],
      '2026-10-19',
      '2026-10-25',
    );
    assert.deepEqual(
      list.map((f) => [f.personId, followUpLine(f, '2026-10-24')]),
      [
        ['t', 'Soreness 10, 2 days running'],
        ['m', 'Sleep quality 2 today'],
        ['k', 'Mood 1 on Wed 21 Oct'],
      ],
    );
  });

  it('reads the far end the right way round', () => {
    const [motivation, , , stress] = SCALES;
    assert.ok(motivation !== undefined && stress !== undefined);
    assert.equal(atFarEnd(motivation, 2), true);
    assert.equal(atFarEnd(motivation, 9), false);
    assert.equal(atFarEnd(stress, 9), true);
    assert.equal(atFarEnd(stress, 2), false);
  });
});

describe('sessionsByDay', () => {
  it('counts sessions by type each day, and averages their RPE', () => {
    const days = sessionsByDay(
      [
        { id: '1', personId: 'a', on: '2026-10-20', kind: 'team_training', rpe: 7 },
        { id: '2', personId: 'b', on: '2026-10-20', kind: 'gym', rpe: 4 },
        { id: '3', personId: 'a', on: '2026-10-22', kind: 'team_training', rpe: 6 },
      ],
      '2026-10-20',
      '2026-10-22',
    );
    assert.deepEqual(days.map((d) => [d.day, d.total, d.averageRpe, d.counts.team_training]), [
      ['2026-10-20', 2, 5.5, 1],
      ['2026-10-21', 0, null, 0],
      ['2026-10-22', 1, 6, 1],
    ]);
    assert.equal(daysOf('2026-10-30', '2026-11-02').length, 4);
  });
});
