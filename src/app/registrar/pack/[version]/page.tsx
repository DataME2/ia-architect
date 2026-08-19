import { notFound, redirect } from 'next/navigation';

import { loadPack, loadPackRecords } from '../../../../data/packs.ts';
import { loadSeasons, loadTenantContext } from '../../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../../data/server.ts';
import { canHandOver, recordStateSummary } from '../../../../web/pack-view.ts';
import { recordHandoverAction, recordOutcomeAction } from '../actions.ts';

export const dynamic = 'force-dynamic';

const STATE_PILL: Record<string, { readonly tone: string; readonly label: string }> = {
  sent: { tone: 'pill-warn', label: 'Sent — not registered' },
  confirmed_present: { tone: 'pill-ok', label: 'Registered' },
  rejected: { tone: 'pill-stop', label: 'Rejected' },
};

export default async function PackDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly version: string }>;
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const version = Number((await params).version);
  if (!Number.isInteger(version) || version < 1) notFound();

  const seasons = await loadSeasons(client, tenant.clubId);
  const requested = (await searchParams).season;

  let pack = null;
  let seasonId = '';
  let seasonName = '';
  for (const season of requested ? seasons.filter((s) => s.id === requested) : seasons) {
    const found = await loadPack(client, tenant.clubId, season.id, version);
    if (found !== null) {
      pack = found;
      seasonId = season.id;
      seasonName = season.name;
      break;
    }
  }
  if (pack === null) notFound();

  const records = await loadPackRecords(client, tenant.clubId, pack.id);
  const summary = recordStateSummary(records);
  const handoverAllowed = canHandOver({
    rowCount: pack.manifest.length,
    handedOverAt: pack.handed_over_at,
  });

  // The manifest holds the frozen rows, so this table shows what was
  // actually sent rather than what the person rows say today (BR58).
  const nameById = new Map(
    pack.manifest.map((row) => [row.personId, `${row.legalGivenNames} ${row.legalFamilyName}`]),
  );

  return (
    <>
      <p style={{ marginBottom: '0.25rem' }}>
        <a href="/registrar/pack">&larr; All packs</a>
      </p>

      <div className="card-row">
        <h2 style={{ marginTop: '0.5rem' }}>
          Pack v{pack.version} — {seasonName}
        </h2>
        {pack.handed_over_at === null ? (
          <span className="pill pill-warn">Not sent</span>
        ) : (
          <span className="pill pill-ok">Handed over</span>
        )}
      </div>

      <p className="lede">
        Generated {new Date(pack.generated_at).toLocaleString('en-AU')} with{' '}
        {pack.manifest.length} {pack.manifest.length === 1 ? 'player' : 'players'}. This version
        is immutable — correcting anything means generating a new one, so the club can always
        say what it sent and when (BR58).
      </p>

      <p>
        <a className="button" href={`/registrar/pack/${version}/download?season=${seasonId}`}>
          Download CSV
        </a>
      </p>

      {pack.handed_over_at !== null && (
        <div className="summary-grid">
          <div className="stat">
            <span className="n">{summary.sent}</span>
            <span className="label">sent, awaiting the federation</span>
          </div>
          <div className="stat">
            <span className="n">{summary.confirmed}</span>
            <span className="label">confirmed registered</span>
          </div>
          <div className="stat">
            <span className="n">{summary.rejected}</span>
            <span className="label">rejected</span>
          </div>
        </div>
      )}

      {handoverAllowed && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Record the handover</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Once this pack leaves, it is a file holding {pack.manifest.length} children&rsquo;s
            legal names and dates of birth, somewhere the platform cannot see. Recording the
            channel is one of the few controls that still applies afterwards (BR59). This can
            only be recorded once.
          </p>
          <form action={recordHandoverAction} className="stack" style={{ marginTop: '1rem' }}>
            <input type="hidden" name="seasonId" value={seasonId} />
            <input type="hidden" name="version" value={version} />
            <div className="field">
              <label htmlFor="channel">How was it handed over?</label>
              <input
                id="channel"
                name="channel"
                type="text"
                required
                placeholder="e.g. Emailed to registrations@footballqueensland.com.au"
              />
            </div>
            <div>
              <button type="submit">Record handover of v{version}</button>
            </div>
          </form>
          <p className="notice" style={{ marginTop: '1.1rem', marginBottom: 0 }}>
            Every person will be recorded as <strong>sent</strong>, and their registration moves
            to the eligibility gate — never to registered. Sending is the club&rsquo;s act;
            registering is the federation&rsquo;s, and only the second lets a player take the
            field (BR60, BR43).
          </p>
        </section>
      )}

      {pack.handed_over_at !== null && (
        <p className="notice">
          Handed over {new Date(pack.handed_over_at).toLocaleString('en-AU')}
          {pack.handover_channel !== null && <> via {pack.handover_channel}</>}.
        </p>
      )}

      <h2>{records.length > 0 ? 'What came back' : 'Contents'}</h2>

      {records.length === 0 ? (
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            Nothing has been sent yet, so there is nothing to hear back about. These are the rows
            as frozen at generation.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Legal name</th>
                  <th>Date of birth</th>
                  <th>Guardian</th>
                  <th>Photograph</th>
                </tr>
              </thead>
              <tbody>
                {pack.manifest.map((row) => (
                  <tr key={row.personId}>
                    <td>
                      {row.legalGivenNames} {row.legalFamilyName}
                    </td>
                    <td>{row.dateOfBirth}</td>
                    <td>{row.guardianLegalName ?? '—'}</td>
                    <td>{row.photoPath === null ? 'No' : 'Yes'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="hint" style={{ marginTop: 0 }}>
            Record what the federation said. Only a confirmed presence in their system completes
            a registration — a rejection sends it back to you with the reason kept verbatim.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Player (as sent)</th>
                  <th>State</th>
                  <th>Record outcome</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const pill = STATE_PILL[record.state] ?? STATE_PILL['sent']!;
                  return (
                    <tr key={record.id}>
                      <td>
                        {nameById.get(record.person_id) ?? record.person_id}
                        {record.rejection_reason !== null && (
                          <p className="hint" style={{ margin: '0.25rem 0 0' }}>
                            {record.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${pill.tone}`}>{pill.label}</span>
                      </td>
                      <td>
                        <form
                          action={recordOutcomeAction}
                          style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
                        >
                          <input type="hidden" name="seasonId" value={seasonId} />
                          <input type="hidden" name="version" value={version} />
                          <input type="hidden" name="recordId" value={record.id} />
                          <input type="hidden" name="personId" value={record.person_id} />
                          <select name="outcome" defaultValue={record.state} aria-label="Outcome">
                            <option value="sent">Sent</option>
                            <option value="confirmed_present">Confirmed registered</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <input
                            type="text"
                            name="rejectionReason"
                            placeholder="Reason, if rejected"
                            aria-label="Rejection reason"
                          />
                          <button type="submit" className="secondary">
                            Save
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginBottom: 0 }}>
            Rejection reasons are kept word for word. Over a season they reconstruct the import
            specification the club has never been given (open question #44).
          </p>
        </div>
      )}
    </>
  );
}
