/**
 * An iCalendar document (RFC 5545).
 *
 * Pure, and worth being pure: the output is read by Gmail, Yahoo, Outlook
 * and Apple Calendar rather than by a person, so a mistake does not look
 * wrong — it looks like a calendar that quietly duplicates every event,
 * shows a kick-off an hour or a day out for a viewer on the wrong client,
 * or silently refuses to subscribe at all. None of that is visible on a
 * screen.
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
 *   * **Times in UTC, not a bare `TZID`.** A `DTSTART;TZID=Australia/
 *     Brisbane:…` with no `VTIMEZONE` block defining that zone is not a
 *     complete document per §3.2.19 — one client infers the zone from its
 *     IANA name and gets it right, another reads it as a floating local
 *     time, and which one happens is exactly the kind of variation that
 *     shows up as "it works in Gmail but not in Outlook" rather than as an
 *     error anyone sees. A `Z`-suffixed UTC instant has no such ambiguity.
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
 * `timeZone`'s UTC offset, in minutes, at a specific instant.
 *
 * Read from `Intl` rather than a bundled tz database: correct for every
 * zone Node's ICU data knows, including one that observes daylight saving,
 * without this project carrying transition tables of its own to keep
 * current. (The club this feed is built for is in `Australia/Brisbane`,
 * which never changes — but the computation does not assume that.)
 */
function utcOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});

  const readAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return Math.round((readAsUtc - at.getTime()) / 60000);
}

/**
 * A kick-off given as a wall-clock date and time in `timeZone`, as the UTC
 * instant it actually refers to.
 *
 * **Emitted as UTC rather than `DTSTART;TZID=…`, deliberately.** A bare
 * TZID with no `VTIMEZONE` block defining it is not a complete calendar
 * document (RFC 5545 §3.2.19) — some clients infer the zone from its IANA
 * name and get it right, others read the same line as a *floating* local
 * time, or reject the property outright, and which one happens is exactly
 * the kind of variation a family only discovers when Saturday's kick-off
 * shows up at the wrong hour in Yahoo Mail's calendar but not in Gmail's.
 * A `Z`-suffixed UTC timestamp has no such ambiguity: every client that
 * understands RFC 5545 at all converts it to the viewer's own zone
 * correctly, without needing to already know or be handed the rules for
 * `Australia/Brisbane`.
 *
 * Two readings rather than one: the offset near a daylight-saving boundary
 * depends on which side of it the instant falls, and the first guess (the
 * wall-clock reading treated as if it were already UTC) can land on the
 * wrong side of a transition that happens between the guess and the true
 * instant. A second reading, taken at the first guess's answer, is enough
 * to converge — no zone changes its offset twice in one day.
 */
function utcInstantFor(playedOn: string, kickOff: string, timeZone: string): Date {
  const [h = '00', m = '00', sec = '00'] = kickOff.split(':');
  const [y, mo, d] = playedOn.split('-').map(Number) as [number, number, number];
  const wallReadAsUtc = Date.UTC(y, mo - 1, d, Number(h), Number(m), Number(sec));

  const firstGuess = utcOffsetMinutes(timeZone, new Date(wallReadAsUtc));
  const refined = utcOffsetMinutes(timeZone, new Date(wallReadAsUtc - firstGuess * 60000));
  return new Date(wallReadAsUtc - refined * 60000);
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
        : `DTSTART:${stamp(utcInstantFor(event.playedOn, event.kickOff, options.timeZone))}`,
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
