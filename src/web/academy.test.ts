import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addDays,
  minutesByPosition,
  nightLabel,
  parseAttendanceMarks,
  parseGameTime,
  parseTrainingNights,
  summariseNights,
  weekOf,
} from './academy.ts';

describe('dates', () => {
  it('adds days across a month and a year', () => {
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(addDays('2026-12-28', 7), '2027-01-04');
  });

  it('runs a week Monday to Sunday', () => {
    assert.deepEqual(weekOf('2026-10-25'), { from: '2026-10-19', to: '2026-10-25' });
    assert.deepEqual(weekOf('2026-10-26'), { from: '2026-10-26', to: '2026-11-01' });
  });
});

describe('nightLabel', () => {
  it('reads a night as the club says it', () => {
    assert.equal(nightLabel({ heldOn: '2026-10-27', startsAt: '17:30', endsAt: '19:00', venue: 'Main pitch' }), 'Tue 27 Oct · 17:30–19:00 · Main pitch');
    assert.equal(nightLabel({ heldOn: '2026-10-27', startsAt: '17:30', endsAt: null, venue: null }), 'Tue 27 Oct · 17:30');
  });
});

describe('parseTrainingNights', () => {
  const base = { teamId: 't1', from: '2026-10-27', startsAt: '17:30' };

  it('makes one night, or one a week until a date', () => {
    const one = parseTrainingNights(base);
    assert.ok(one.ok);
    assert.deepEqual(one.dates, ['2026-10-27']);
    const weekly = parseTrainingNights({ ...base, until: '2026-11-17', endsAt: '19:00', venue: ' Main pitch ' });
    assert.ok(weekly.ok);
    assert.deepEqual(weekly.dates, ['2026-10-27', '2026-11-03', '2026-11-10', '2026-11-17']);
    assert.equal(weekly.venue, 'Main pitch');
  });

  it('refuses what cannot be a night', () => {
    assert.equal(parseTrainingNights({ ...base, teamId: '' }).ok, false);
    assert.equal(parseTrainingNights({ ...base, endsAt: '17:00' }).ok, false);
    assert.equal(parseTrainingNights({ ...base, until: '2026-10-20' }).ok, false);
    assert.equal(parseTrainingNights({ ...base, until: '2028-10-27' }).ok, false);
  });
});

describe('parseAttendanceMarks', () => {
  it('keeps the marked players and leaves the rest alone', () => {
    const parsed = parseAttendanceMarks(
      [
        ['mark:a', 'present'],
        ['mark:b', 'absent'],
        ['reason:b', ' Sick '],
        ['mark:c', ''],
        ['mark:z', 'present'],
      ],
      ['a', 'b', 'c'],
    );
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.marks, [
      { personId: 'a', mark: 'present', reason: null },
      { personId: 'b', mark: 'absent', reason: 'Sick' },
    ]);
  });

  it('refuses an empty sheet and an unknown mark', () => {
    assert.equal(parseAttendanceMarks([], ['a']).ok, false);
    assert.equal(parseAttendanceMarks([['mark:a', 'maybe']], ['a']).ok, false);
  });
});

describe('summariseNights', () => {
  it('counts answers for every night and marks only for nights held', () => {
    const s = summariseNights({
      nights: [
        { id: 'n1', heldOn: '2026-10-20', cancelled: false },
        { id: 'n2', heldOn: '2026-10-22', cancelled: false },
        { id: 'n3', heldOn: '2026-10-21', cancelled: true },
      ],
      playerIds: ['a', 'b'],
      answers: [
        { sessionId: 'n1', personId: 'a', available: true },
        { sessionId: 'n1', personId: 'b', available: false },
        { sessionId: 'n2', personId: 'a', available: true },
      ],
      marks: [
        { sessionId: 'n1', personId: 'a', mark: 'present' },
        { sessionId: 'n1', personId: 'b', mark: 'absent' },
      ],
      today: '2026-10-21',
    });
    assert.deepEqual(s, {
      nights: 2,
      available: 2,
      notAvailable: 1,
      noAnswer: 1,
      trained: 1,
      late: 0,
      absent: 1,
      unmarked: 0,
    });
  });
});

describe('parseGameTime', () => {
  it('reads minutes by position and who started', () => {
    const parsed = parseGameTime(
      [
        ['min:a:midfielder', '40'],
        ['min:a:forward', '20'],
        ['started:a', 'on'],
        ['min:b:defender', '0'],
      ],
      ['a', 'b'],
    );
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.rows, [{ personId: 'a', started: true, positions: { midfielder: 40, forward: 20 } }]);
  });

  it('refuses impossible minutes', () => {
    assert.equal(parseGameTime([['min:a:forward', '-3']], ['a']).ok, false);
    assert.equal(parseGameTime([['min:a:forward', '4.5']], ['a']).ok, false);
    assert.equal(parseGameTime([['min:a:forward', '150'], ['min:a:defender', '60']], ['a']).ok, false);
    assert.equal(parseGameTime([], ['a']).ok, false);
  });
});

describe('minutesByPosition', () => {
  it('splits a season by position and names what has no position', () => {
    const rows = minutesByPosition([
      { personId: 'a', minutes: 60, positions: [{ position: 'midfielder', minutes: 60 }] },
      { personId: 'a', minutes: 90, positions: [] },
      { personId: 'b', minutes: 200, positions: [{ position: 'goalkeeper', minutes: 180 }] },
    ]);
    assert.deepEqual(rows, [
      { personId: 'b', total: 200, byPosition: { goalkeeper: 180, defender: 0, midfielder: 0, forward: 0 }, unplaced: 20 },
      { personId: 'a', total: 150, byPosition: { goalkeeper: 0, defender: 0, midfielder: 60, forward: 0 }, unplaced: 90 },
    ]);
  });
});
