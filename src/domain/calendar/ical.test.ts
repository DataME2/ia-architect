import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildFeed, escapeText, foldLine, type FeedEvent, type FeedOptions } from './ical.ts';

const OPTIONS: FeedOptions = {
  calendarName: 'North Star FC — match officials',
  timeZone: 'Australia/Brisbane',
  domain: 'letsdatatalk.test',
  now: new Date('2026-09-14T03:00:00Z'),
};

/**
 * Undo §3.1's folding, which is what any consumer must do before reading a
 * value. Asserting on the folded text would be asserting on the transport.
 */
const unfold = (feed: string): string => feed.replace(/\r\n /g, '');

const event = (over: Partial<FeedEvent> = {}): FeedEvent => ({
  appointmentId: 'a1b2c3d4-0000-0000-0000-000000000001',
  playedOn: '2026-07-04',
  kickOff: '10:00:00',
  venue: 'North Star Park',
  competition: 'Capital League 1',
  ownRole: 'referee',
  state: 'accepted',
  fixtureStatus: 'scheduled',
  updatedAt: '2026-06-01T00:00:00Z',
  ...over,
});

test('escapeText — RFC 5545 §3.3.11', async (t) => {
  await t.test('escapes the backslash first, or everything after is wrong', () => {
    assert.equal(escapeText('a\\b'), 'a\\\\b');
  });

  await t.test('escapes a comma, a semicolon and a newline', () => {
    // "Pitch 3, North" breaks the property without this.
    assert.equal(escapeText('Pitch 3, North'), 'Pitch 3\\, North');
    assert.equal(escapeText('a;b'), 'a\;b');
    assert.equal(escapeText('a\nb'), 'a\\nb');
    assert.equal(escapeText('a\r\nb'), 'a\\nb');
  });

  await t.test('leaves an ordinary value alone', () => {
    assert.equal(escapeText('North Star Park'), 'North Star Park');
  });
});

test('foldLine — §3.1', async (t) => {
  await t.test('leaves a short line alone', () => {
    assert.equal(foldLine('SUMMARY:short'), 'SUMMARY:short');
  });

  await t.test('folds at 75 octets with a leading space', () => {
    const folded = foldLine('SUMMARY:' + 'x'.repeat(120));
    const [first, second] = folded.split('\r\n');
    assert.equal(Buffer.from(first as string, 'utf8').length, 75);
    assert.ok((second as string).startsWith(' '));
  });

  await t.test('counts octets, not characters, and never splits a sequence', () => {
    // A venue with accents is more bytes than it looks, and a fold through
    // the middle of a UTF-8 sequence produces a line no client can read.
    const folded = foldLine('LOCATION:' + 'é'.repeat(60));
    for (const part of folded.split('\r\n')) {
      assert.ok(Buffer.from(part, 'utf8').length <= 75);
      // Round-trips: no replacement characters from a broken split.
      assert.ok(!part.includes('�'));
    }
    assert.equal(folded.split('\r\n').map((p) => p.replace(/^ /, '')).join(''),
      'LOCATION:' + 'é'.repeat(60));
  });
});

test('buildFeed — what a calendar client actually reads', async (t) => {
  await t.test('uses CRLF throughout, as §3.1 requires', () => {
    const feed = buildFeed([event()], OPTIONS);
    assert.ok(feed.endsWith('\r\n'));
    assert.equal(feed.split('\n').length - 1, feed.split('\r\n').length - 1);
  });

  await t.test('keys the UID on the appointment, so a refresh updates rather than duplicates', () => {
    // The single most consequential rule here: a regenerated UID is a
    // second event on every refresh, forever.
    const a = buildFeed([event()], OPTIONS);
    const b = buildFeed([event()], { ...OPTIONS, now: new Date('2027-01-01T00:00:00Z') });
    const uid = (feed: string) => feed.split('\r\n').find((l) => l.startsWith('UID:'));
    assert.equal(uid(a), uid(b));
    assert.match(uid(a) ?? '', /^UID:a1b2c3d4-0000-0000-0000-000000000001@letsdatatalk\.test$/);
  });

  await t.test('carries no other participant’s data (BR32)', () => {
    const feed = buildFeed([event()], OPTIONS);
    // Every one of these properties carries somebody else's address.
    for (const forbidden of ['ATTENDEE', 'ORGANIZER', 'CONTACT']) {
      assert.ok(!feed.includes(forbidden), `${forbidden} names somebody who is not the subscriber`);
    }
  });

  await t.test('names the subscriber’s own role and the competition, never the opponent', () => {
    const feed = unfold(buildFeed([event()], OPTIONS));
    assert.match(feed, /SUMMARY:Referee — Capital League 1/);
  });

  await t.test('marks an unaccepted proposal as one', () => {
    // A calendar showing a proposal as a commitment sends somebody to a
    // ground they never agreed to attend.
    const feed = unfold(buildFeed([event({ state: 'proposed' })], OPTIONS));
    assert.match(feed, /not yet accepted/);
  });

  await t.test('cancels rather than drops a cancelled fixture', () => {
    const feed = buildFeed([event({ fixtureStatus: 'cancelled' })], OPTIONS);
    assert.match(feed, /STATUS:CANCELLED/);
    assert.match(feed, /SUMMARY:CANCELLED/);
  });

  await t.test('uses an all-day entry when no kick-off is set', () => {
    // Midnight would send somebody to a ground before dawn.
    const feed = buildFeed([event({ kickOff: null })], OPTIONS);
    assert.match(feed, /DTSTART;VALUE=DATE:20260704/);
    assert.ok(!feed.includes('T000000'));
  });

  await t.test('places a timed event as an unambiguous UTC instant, not a bare TZID', () => {
    // Brisbane is UTC+10 year-round: 10:00 local is 00:00 UTC the same day.
    // No VTIMEZONE, no client-dependent interpretation — Gmail, Yahoo and
    // Outlook all read the same instant.
    const feed = buildFeed([event()], OPTIONS);
    assert.match(feed, /DTSTART:20260704T000000Z/);
    assert.ok(!feed.includes('TZID'), 'a bare TZID with no VTIMEZONE is not a complete document');
  });

  await t.test('accepts a time with or without seconds', () => {
    // 09:30 Brisbane, still UTC+10, is 23:30 UTC the previous day.
    assert.match(buildFeed([event({ kickOff: '09:30' })], OPTIONS), /DTSTART:20260703T233000Z/);
  });

  await t.test('converts correctly across a daylight-saving boundary, for a zone that has one', () => {
    // Brisbane never needs this, but the conversion is general rather than
    // hardcoded to a zone that happens not to change — Sydney observes AEST
    // (UTC+10) in July and AEDT (UTC+11) in January, so the same 10:00
    // kick-off lands on a different UTC minute depending on the date.
    const july = buildFeed([event({ playedOn: '2026-07-04' })], { ...OPTIONS, timeZone: 'Australia/Sydney' });
    const january = buildFeed([event({ playedOn: '2026-01-10' })], { ...OPTIONS, timeZone: 'Australia/Sydney' });
    assert.match(july, /DTSTART:20260704T000000Z/);
    assert.match(january, /DTSTART:20260109T230000Z/);
  });

  await t.test('escapes a venue that contains a comma', () => {
    const feed = buildFeed([event({ venue: 'Pitch 3, North' })], OPTIONS);
    assert.match(feed, /LOCATION:Pitch 3\\, North/);
  });

  await t.test('says the copy is a copy (BR34)', () => {
    assert.match(unfold(buildFeed([event()], OPTIONS)), /record is the one that counts/);
  });

  await t.test('produces a valid empty calendar when nothing is appointed', () => {
    const feed = buildFeed([], OPTIONS);
    assert.match(feed, /^BEGIN:VCALENDAR\r\n/);
    assert.match(feed, /END:VCALENDAR\r\n$/);
    assert.ok(!feed.includes('BEGIN:VEVENT'));
  });
});
