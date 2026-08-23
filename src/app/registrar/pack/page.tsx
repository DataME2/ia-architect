import { redirect } from 'next/navigation';

import { buildSubmissionPack } from '../../../domain/submission/build-pack.ts';
import { loadPacks, nextPackVersion } from '../../../data/packs.ts';
import { loadPackCandidates, loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { exclusionSummary } from '../../../web/pack-view.ts';
import { todayIn } from '../../../web/today.ts';
import { generatePackAction } from './actions.ts';

export const dynamic = 'force-dynamic';

export default async function PackIndexPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) {
    return (
      <>
        <h2>No club yet</h2>
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>No seasons configured</h2>
        <p className="lede">A pack covers one season, and {tenant.clubName} has none yet.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;

  const candidates = await loadPackCandidates(client, tenant.clubId, season.id);
  const version = await nextPackVersion(client, tenant.clubId, season.id);

  // A dry run of exactly what generating would produce. Same pure function,
  // same inputs — so the preview is the pack, not an approximation of it.
  const preview = buildSubmissionPack(candidates, {
    clubId: tenant.clubId,
    seasonId: season.id,
    version,
    generatedAt: new Date().toISOString(),
    generatedByUserId: user.id,
    includePhotographs: false,
    asAt: todayIn(),
  });

  const exclusions = exclusionSummary(preview);
  const packs = await loadPacks(client, tenant.clubId, season.id);

  return (
    <>
      <h2>Submission pack — {season.name}</h2>
      <p className="lede">
        The club&rsquo;s validated registrations, assembled into one versioned file for the
        governing body to import — or for someone to key in from without re-deriving anything.
        The platform produces a file; it never connects to the federation&rsquo;s system.
      </p>

      <div className="summary-grid">
        <div className="stat">
          <span className="n">{preview.rows.length}</span>
          <span className="label">would be included</span>
        </div>
        <div className="stat">
          <span className="n">{preview.excluded.length}</span>
          <span className="label">would be left out</span>
        </div>
        <div className="stat">
          <span className="n">v{version}</span>
          <span className="label">next version</span>
        </div>
      </div>

      {exclusions.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Who would be left out, and why</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            A pack never ships known-bad data: a registration that fails a rule, or that has an
            unresolved duplicate, is excluded with a reason rather than included with a caveat.
            A caveat in a spreadsheet is not read. These are the people who will otherwise turn
            up on match day ineligible.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>People</th>
                </tr>
              </thead>
              <tbody>
                {exclusions.map((group) => (
                  <tr key={group.reason}>
                    <td>{group.label}</td>
                    <td>{group.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: '1rem', marginBottom: 0 }}>
            <a className="button secondary" href={`/registrar/pack/preview/exclusions?season=${season.id}`}>
              Download the work list
            </a>
          </p>
        </section>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Generate version {version}</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Generating freezes an artifact. It does <strong>not</strong> send anything and does
          not change any registration&rsquo;s status — recording the handover does that,
          separately and on purpose.
        </p>

        <form action={generatePackAction} style={{ marginTop: '1rem' }}>
          <input type="hidden" name="seasonId" value={season.id} />

          <div className="check">
            <input type="checkbox" id="includePhotographs" name="includePhotographs" />
            <label htmlFor="includePhotographs">
              Include identification photographs. Only travels for players whose guardian gave a
              live photograph consent naming that disclosure (BR56) — the rest are omitted
              regardless of this box.
            </label>
          </div>

          <button type="submit" disabled={preview.rows.length === 0}>
            {preview.rows.length === 0
              ? 'Nothing to pack yet'
              : `Generate v${version} with ${preview.rows.length} ${preview.rows.length === 1 ? 'player' : 'players'}`}
          </button>
        </form>
      </section>

      <h2>Previous packs</h2>
      {packs.length === 0 ? (
        <p className="empty">None generated for this season yet.</p>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Generated</th>
                  <th>People</th>
                  <th>Handed over</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((pack) => (
                  <tr key={pack.id}>
                    <td>
                      <a href={`/registrar/pack/${pack.version}?season=${season.id}`}>
                        v{pack.version}
                      </a>
                    </td>
                    <td>{new Date(pack.generated_at).toLocaleString('en-AU')}</td>
                    <td>{pack.manifest.length}</td>
                    <td>
                      {pack.handed_over_at === null ? (
                        <span className="pill pill-warn">Not sent</span>
                      ) : (
                        <>
                          {new Date(pack.handed_over_at).toLocaleDateString('en-AU')}
                          {pack.handover_channel !== null && ` — ${pack.handover_channel}`}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
