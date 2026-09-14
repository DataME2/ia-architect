import { notFound } from 'next/navigation';

import { createUserClient } from '../../../data/client.ts';
import { loadEventDetail } from '../../../data/carnivals.ts';
import { ladder, nextFixtureFor } from '../../../domain/carnival/ladder.ts';

export const dynamic = 'force-dynamic';

/**
 * The Public Event View (BR26, BR27, P6).
 *
 * **The one page in this product a stranger may read.** No session, no
 * account, and no branch deciding what to hide: `createUserClient()` with
 * no token is `anon`, and the additive policy on `published_at` is what
 * makes an unpublished event `notFound()` here. The decision lives in the
 * database, so there is no second code path to get wrong.
 *
 * And there is no personal data to withhold. `carnival_fixture` carries no
 * `person_id` column at all (BR139) — a visitor learns that North Star's
 * under-12s play Coast at 10am on pitch 3, which is exactly what BR26 says
 * they may know.
 */
export default async function PublicEventPage({
  params,
}: {
  readonly params: Promise<{ readonly eventId: string }>;
}) {
  const { eventId } = await params;
  const detail = await loadEventDetail(createUserClient(), eventId);

  // Unpublished and non-existent are indistinguishable, deliberately: that
  // an event exists but is not ready is not a stranger's business.
  if (detail === null || detail.event.publishedAt === null) notFound();

  const { event, entries, fixtures } = detail;
  const table = ladder(entries, fixtures, {
    win: event.pointsForWin,
    draw: event.pointsForDraw,
  });
  const byId = new Map(entries.map((e) => [e.id, e]));
  const nameOf = (id: string) => {
    const e = byId.get(id);
    return e === undefined ? 'Unknown' : `${e.entrantName} ${e.teamName}`;
  };

  return (
    <>
      <h2>{event.name}</h2>
      <p className="lede">
        {event.startsOn === event.endsOn ? event.startsOn : `${event.startsOn} to ${event.endsOn}`}
        {event.venue !== null && <> &middot; {event.venue}</>}
      </p>

      {event.conditions !== null && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Conditions</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{event.conditions}</p>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Draw</h3>
        {fixtures.length === 0 ? (
          <p className="empty">The draw has not been published yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Date</th><th>Time</th><th>Match</th><th>Venue</th><th>Result</th></tr>
              </thead>
              <tbody>
                {fixtures.map((f) => (
                  <tr key={f.id}>
                    <td>{f.playedOn}</td>
                    <td>{f.kickOff ?? <span className="hint">tbc</span>}</td>
                    <td>{nameOf(f.homeEntryId)} v {nameOf(f.awayEntryId)}</td>
                    <td>{f.venue ?? <span className="hint">tbc</span>}</td>
                    <td>
                      {f.status === 'played' && f.homeGoals !== null
                        ? `${f.homeGoals}–${f.awayGoals}`
                        : <span className="hint">{f.status === 'scheduled' ? 'to play' : f.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Standings</h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th>
                <th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Next</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => {
                const next = nextFixtureFor(row.entryId, fixtures);
                return (
                  <tr key={row.entryId}>
                    <td>{row.entrantName} {row.teamName}</td>
                    <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td>
                    <td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference}</td>
                    <td><strong>{row.points}</strong></td>
                    <td>
                      {next === null
                        ? <span className="hint">&mdash;</span>
                        : `${next.playedOn} ${next.kickOff ?? ''}`.trim()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">
          {event.pointsForWin} points for a win, {event.pointsForDraw} for a draw.
        </p>
      </section>

      <p className="note">
        Team and club results only. No player&rsquo;s name appears on this page, and none is held
        against these fixtures.
      </p>
    </>
  );
}
