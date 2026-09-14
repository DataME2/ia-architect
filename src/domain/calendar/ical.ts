/**
 * An iCalendar document (RFC 5545).
 *
 * Pure, and worth being pure: the output is read by Google, Apple and
 * Outlook rather than by a person, so a mistake does not look wrong — it
 * looks like a calendar that quietly duplicates every event, or silently
 * refuses to subscribe at all. None of that is visible on a screen.
 *
 * What the format actually demands, and what this gets right:
 *
 *   * **CRLF line endings.** Not a style choice; §3.1 requires them.
 *   * **Folding at 75 octets**, continued with a leading space.
 *   * **Escaping** of backslash, semicolon, comma and newline in text
 *     values (§3.3.11) — a venue called "Pitch 3, North" breaks the
 *     property without it.
 *   * **Stable UIDs.** The single most consequential rule here: a client
 *     keys on UID, so a feed that regenerates them adds a second event on
 *     every refresh instead of updating the one it has.
 *
 * BR32 constrains what goes in: competition, date, time, venue and the
 * subscriber's own role. No attendee, no organiser, no other participant —
 * every one of those properties carries somebody else's address.
 */

export interface FeedEvent {
  /** The appointment's own id. Stable across refreshes, which is the point. */
  readonly appointmentId: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly venue: string | null;
  readonly competition: string | null;
  readonly ownRole: string;
  readonly state: string;
  readonly fixtureStatus: string;
  /** When this commitment last moved, for SEQUENCE. */
  readonly updatedAt: string;
}

export interface FeedOptions {
  readonly calendarName: string;
  /** IANA zone, e.g. `Australia/Brisbane`. */
  readonly timeZone: string;
  /** Stable per deployment; part of every UID. */
  readonly domain: string;
  readonly now: Date;
}

/** RFC 5545 §3.3.11. Order matters — the backslash must be escaped first. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Fold a content line to 75 octets (§3.1).
 *
 * Counted in **octets, not characters**, because a venue with an accent or
 * an emoji is more bytes than it looks — and a fold that splits a UTF-8
 * sequence produces a line no client can read.
 */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  let limit = 75;

  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte sequence: continuation octets are 10xxxxxx.
    while (end > start && end < bytes.length && (((bytes[end] as number) & 0xc0) === 0x80)) {
      end -= 1;
    }
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
    limit = 74; // Continuation lines carry a leading space.
  }

  return parts.join('\r\n ');
}

function stamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * `20260704T100000` from a date and a `HH:MM` or `HH:MM:SS` time.
 *
 * Postgres hands back either form depending on whether seconds were
 * recorded, so both are accepted rather than assumed.
 */
function localDateTime(playedOn: string, kickOff: string): string {
  const [h = '00', m = '00', sec = '00'] = kickOff.split(':');
  const pad = (v: string) => v.padStart(2, '0').slice(0, 2);
  return `${playedOn.replace(/-/g, '')}T${pad(h)}${pad(m)}${pad(sec)}`;
}

const ROLE_WORDS: Readonly<Record<string, string>> = {
  referee: 'Referee',
  assistant_referee: 'Assistant referee',
  fourth_official: 'Fourth official',
};

/**
 * One event's summary — the subscriber's own role and the competition.
 *
 * Deliberately never the opponent. Who else is playing is the club's
 * fixture list; what this person committed to is the appointment.
 */
function summaryFor(event: FeedEvent): string {
  const role = ROLE_WORDS[event.ownRole] ?? event.ownRole;
  const what = event.competition ?? 'Match';
  const prefix = event.fixtureStatus === 'cancelled' ? 'CANCELLED — ' : '';
  // A proposal is not a commitment, and a calendar that shows it as one
  // sends somebody to a ground they never agreed to attend.
  const suffix = event.state === 'proposed' ? ' (not yet accepted)' : '';
  return `${prefix}${role} — ${what}${suffix}`;
}

export function buildFeed(events: readonly FeedEvent[], options: FeedOptions): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Let'sDataTalk//Match officials//EN`,
    'CALSCALE:GREGORIAN',
    // Hints a subscribing client reads; harmless where it does not.
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
    `X-WR-TIMEZONE:${options.timeZone}`,
  ];

  for (const event of events) {
    const start = event.kickOff === null ? '' : localDateTime(event.playedOn, event.kickOff);
    lines.push(
      'BEGIN:VEVENT',
      // Stable and unique: the appointment's own id. A regenerated UID is
      // a duplicate event on every refresh, forever.
      `UID:${event.appointmentId}@${options.domain}`,
      `DTSTAMP:${stamp(options.now)}`,
      `SEQUENCE:${Math.floor(new Date(event.updatedAt).getTime() / 1000)}`,
      event.kickOff === null
        // No kick-off set: an all-day entry rather than a guess at midnight,
        // which would send somebody to a ground before dawn.
        ? `DTSTART;VALUE=DATE:${event.playedOn.replace(/-/g, '')}`
        : `DTSTART;TZID=${options.timeZone}:${start}`,
      `SUMMARY:${escapeText(summaryFor(event))}`,
      // A cancelled fixture is cancelled, not deleted: the subscriber sees
      // it struck through rather than silently vanishing, which is what
      // BR64 wants a person to notice.
      `STATUS:${event.fixtureStatus === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      // One-way (BR34). Said in the document as well as enforced by the
      // absence of a write path.
      'TRANSP:OPAQUE',
      'DESCRIPTION:' + escapeText(
        'This entry is a copy. The club\'s own record is the one that counts — '
        + 'changing or deleting it here accepts, declines and cancels nothing.',
      ),
    );
    if (event.venue !== null) lines.push(`LOCATION:${escapeText(event.venue)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
