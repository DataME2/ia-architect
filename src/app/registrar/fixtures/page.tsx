import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadFixtures } from '../../../data/performance.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { FixtureForm } from './FixtureForm.tsx';
import { loadClubCompetitions } from '../../../data/competitions.ts';
import { EditFixtureForm } from './EditFixtureForm.tsx';
import { RecordResultForm } from './RecordResultForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * The games the club played.
 *
 * This exists because nothing else in the platform knew a match had
 * happened — twenty-eight tables and not one fixture. Every appearance,
 * every minute and every goal on a player's record hangs off a row here.
 */
export default async function FixturesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Fixtures</h2>
        <p className="notice">This club has no season yet, and a fixture belongs to one.</p>
      </>
    );
  }

  const fixtures = await loadFixtures(client, tenant.clubId, season.id);

  // The club's competitions this season (scope 38), so the form selects
  // rather than types. Empty is ordinary — a club may catalogue none.
  const competitions = await loadClubCompetitions(client, tenant.clubId, season.id);

  // Prefer the catalogue; fall back to the text a club recorded before it
  // existed (scope 38 does not rewrite history).
  const competitionName = (f: { competition_id?: string | null; competition?: string | null }) =>
    competitions.find((c) => c.id === f.competition_id)?.name ?? f.competition ?? null;

  return (
    <>
      <h2>Fixtures &mdash; {season.name}</h2>
      <p className="lede">
        The games the club played. Nothing else in the platform records that a match happened, so
        every appearance and every goal on a player&rsquo;s record hangs off a row here.
      </p>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{fixtures.length} recorded</h3>
        {fixtures.length === 0 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            None yet.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Competition</th>
                  <th>Result</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((f) => (
                  <tr key={f.id}>
                    <td>{f.played_on}</td>
                    <td>
                      {f.home_away === 'home' ? 'v' : f.home_away === 'away' ? 'at' : 'vs'}{' '}
                      {f.opponent}
                    </td>
                    <td>
                      {competitionName(f) ?? <span className="hint">&mdash;</span>}
                    </td>
                    <td>
                      {f.goals_for === null || f.goals_against === null ? (
                        <span className="hint">not recorded</span>
                      ) : (
                        `${f.goals_for}–${f.goals_against}`
                      )}
                    </td>
                    <td>
                      {f.status === 'played' ? (
                        <span className="pill pill-ok">played</span>
                      ) : (
                        <span className="pill pill-warn">{f.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fixtures.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Change a fixture (BR64)</h3>
          <p className="hint">
            A change to the time, venue or status reaches everyone appointed to it and everyone in
            the team. A change to nothing tells nobody.
          </p>
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {fixtures.map((f) => (
              <li key={f.id}>
                <strong>
                  {f.played_on} {f.home_away === 'home' ? 'v' : 'at'} {f.opponent}
                </strong>
                <EditFixtureForm
                  fixtureId={f.id}
                  kickOff={f.kick_off ?? null}
                  venue={f.venue ?? null}
                  status={f.status}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {fixtures.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Record the result</h3>
          <p className="hint">
            A score is a correction to a game that already happened, not a change to announce —
            saving here tells nobody. A MiniRef&rsquo;s guardian confirming the match (BR151)
            already fills this in when it is empty; use this to enter one that was never reported,
            or to correct one.
          </p>
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {fixtures.map((f) => (
              <li key={f.id}>
                <strong>
                  {f.played_on} {f.home_away === 'home' ? 'v' : 'at'} {f.opponent}
                </strong>
                <RecordResultForm fixtureId={f.id} goalsFor={f.goals_for} goalsAgainst={f.goals_against} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <FixtureForm competitions={competitions} seasonId={season.id} />
    </>
  );
}
