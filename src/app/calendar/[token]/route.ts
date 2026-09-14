import { createUserClient } from '../../../data/client.ts';
import { loadFeed } from '../../../data/calendar.ts';
import { buildFeed } from '../../../domain/calendar/ical.ts';
import { DEFAULT_TIME_ZONE } from '../../../web/today.ts';

export const dynamic = 'force-dynamic';

/**
 * The iCalendar feed (BR30–BR34, [decision 4](../../../../docs/decisions/4_calendar-distribution-by-feed-not-account-access.md)).
 *
 * Anonymous, because a calendar client holds no session — it holds a URL.
 * The token is verified by the database, and `app_calendar_feed` returns a
 * **projection** rather than rows (BR141): there is no parameter here a
 * holder could vary to see somebody else's Saturday.
 *
 * A bad token returns an empty calendar rather than a 404. A calendar
 * client faced with an error retries and eventually nags its owner; an
 * empty calendar is what a revoked feed should look like, and it does not
 * confirm whether the token was ever real.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ readonly token: string }> },
) {
  const { token } = await params;
  // Calendar clients append or tolerate an extension; the token is the rest.
  const clean = token.replace(/\.ics$/i, '');

  const events = await loadFeed(createUserClient(), clean);

  const body = buildFeed(events ?? [], {
    calendarName: 'Match officiating',
    timeZone: DEFAULT_TIME_ZONE,
    domain: 'letsdatatalk',
    now: new Date(),
  });

  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="officiating.ics"',
      // A feed URL is a bearer credential (BR31). Nothing in front of it
      // should hold a copy.
      'cache-control': 'no-store, private',
    },
  });
}
