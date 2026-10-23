import { notFound } from 'next/navigation';

import { seasonFacts, shortDate } from '../../../web/season-calendar.ts';
import { CALENDARS, calendarById } from '../../../web/season-calendars.ts';
import { SeasonPanel } from './SeasonPanel.tsx';

/**
 * One region's season, month by month (scope 101, BR178).
 *
 * Prerendered for every calendar we hold, and nothing else: an unknown id
 * is a 404, never a page built on demand. The calendar is the governing
 * body's public document, so the page reads no session and no club data.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return CALENDARS.map((c) => ({ calendar: c.id }));
}

export async function generateMetadata({ params }: { readonly params: Promise<{ readonly calendar: string }> }) {
  const cal = calendarById((await params).calendar);
  return cal ? { title: `${cal.season} season · ${cal.region}` } : {};
}

export default async function SeasonPage({ params }: { readonly params: Promise<{ readonly calendar: string }> }) {
  const cal = calendarById((await params).calendar);
  if (!cal) notFound();
  const facts = seasonFacts(cal);

  return (
    <>
      <section className="hero season-hero">
        <p className="eyebrow">
          <a href="/seasons">Season calendars</a> · {cal.governingBody} · {cal.season}
        </p>
        <h2>{cal.region}</h2>
        <p className="lede">
          The whole {cal.season} season as {cal.governingBody} publishes it, one month at a time.
          Follow a competition to see where it stands on every weekend.
        </p>
        <dl className="season-facts">
          <div>
            <dt>Competitions</dt>
            <dd>{facts.competitions}</dd>
          </div>
          <div>
            <dt>Weekends</dt>
            <dd>{facts.weekends}</dd>
          </div>
          {facts.firstBall && (
            <div>
              <dt>First round</dt>
              <dd>{shortDate(facts.firstBall)}</dd>
            </div>
          )}
          {facts.lastFinal && (
            <div>
              <dt>Last grand final</dt>
              <dd>{shortDate(facts.lastFinal)}</dd>
            </div>
          )}
        </dl>
        <p className="season-caveat">
          <span className="pill pill-warn">Subject to change</span> {cal.caveat} Source: {cal.governingBody},{' '}
          {cal.source}. Teams, venues and kick-off times come later, with each club’s own fixtures.
        </p>
      </section>

      <SeasonPanel calendar={cal} />
    </>
  );
}
