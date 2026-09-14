import { notFound, redirect } from 'next/navigation';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadEventDetail, loadEvents } from '../../../data/carnivals.ts';
import { ladder } from '../../../domain/carnival/ladder.ts';
import {
  CreateEventForm, EntryForm, FixtureForm, PublishForm, ResultForm,
} from './CarnivalForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * Carnivals, from the host club's side (scope 40).
 *
 * The screen's job beyond the obvious is to keep **published** visible at
 * all times. This is the only place in the product where a click makes
 * something readable by the public, and a coordinator should never have to
 * wonder which state an event is in.
 */
export default async function CarnivalsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly event?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/carnivals');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const events = await loadEvents(client, tenant.clubId);
  const selectedId = (await searchParams).event ?? events[0]?.id;
  const detail = selectedId === undefined ? null : await loadEventDetail(client, selectedId);

  const table = detail === null ? [] : ladder(detail.entries, detail.fixtures, {
    win: detail.event.pointsForWin,
    draw: detail.event.pointsForDraw,
  });
  const byId = new Map((detail?.entries ?? []).map((e) => [e.id, e]));
  const nameOf = (id: string) => {
    const e = byId.get(id);
    return e === undefined ? 'Unknown' : `${e.entrantName} ${e.teamName}`;
  };

  return (
    <>
      <h2>Carnivals</h2>
      <p className="lede">
        Multi-club events, followed by families with no account. Team and club results only &mdash;
        no player&rsquo;s name is held against a carnival fixture (BR139).
      </p>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Create a carnival</h3>
        <CreateEventForm />
      </section>

      {events.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>This club&rsquo;s carnivals</h3>
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {events.map((e) => (
              <li key={e.id}>
                <a href={`/registrar/carnivals?event=${e.id}`}><strong>{e.name}</strong></a>{' '}
                <span className="hint">{e.startsOn}</span>{' '}
                {e.publishedAt === null
                  ? <span className="pill pill-warn">not published</span>
                  : <span className="pill pill-ok">public</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {detail !== null && (
        <>
          <section className="card">
            <h3 style={{ marginTop: 0 }}>{detail.event.name} &mdash; publication (BR140)</h3>
            <PublishForm eventId={detail.event.id} published={detail.event.publishedAt !== null} />
            {detail.event.publishedAt !== null && (
              <p className="hint">
                Public link: <a href={`/events/${detail.event.id}`}>/events/{detail.event.id}</a>
              </p>
            )}
          </section>

          <section className="card">
            <h3 style={{ marginTop: 0 }}>Teams ({detail.entries.length})</h3>
            {detail.entries.length > 0 && (
              <ul className="hint">
                {detail.entries.map((e) => <li key={e.id}>{e.entrantName} {e.teamName}</li>)}
              </ul>
            )}
            <EntryForm eventId={detail.event.id} />
          </section>

          <section className="card">
            <h3 style={{ marginTop: 0 }}>Draw ({detail.fixtures.length})</h3>
            <FixtureForm eventId={detail.event.id} entries={detail.entries} />
            {detail.fixtures.length > 0 && (
              <ul className="stack" style={{ listStyle: 'none', padding: 0, marginTop: 'var(--space-3)' }}>
                {detail.fixtures.map((f) => (
                  <li key={f.id}>
                    <div>
                      <strong>{nameOf(f.homeEntryId)} v {nameOf(f.awayEntryId)}</strong>{' '}
                      <span className="hint">{f.playedOn} {f.kickOff ?? ''} {f.venue ?? ''}</span>
                    </div>
                    <ResultForm
                      fixtureId={f.id}
                      homeGoals={f.homeGoals}
                      awayGoals={f.awayGoals}
                      status={f.status}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {table.length > 0 && (
            <section className="card">
              <h3 style={{ marginTop: 0 }}>Standings</h3>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
                  </thead>
                  <tbody>
                    {table.map((r) => (
                      <tr key={r.entryId}>
                        <td>{r.entrantName} {r.teamName}</td>
                        <td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td>
                        <td>{r.goalDifference}</td><td><strong>{r.points}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
