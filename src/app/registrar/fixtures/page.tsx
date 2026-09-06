import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadFixtures } from '../../../data/performance.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { FixtureForm } from './FixtureForm.tsx';

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
                    <td>{f.competition ?? <span className="hint">&mdash;</span>}</td>
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

      <FixtureForm seasonId={season.id} />
    </>
  );
}
