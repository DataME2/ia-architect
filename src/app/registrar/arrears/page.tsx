import { notFound, redirect } from 'next/navigation';

import { outstandingBalances } from '../../../data/arrears.ts';
import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { arrearsQueue } from '../../../domain/reporting/summary.ts';
import { formatCents } from '../../../web/money.ts';
import { ArrearsActionForm } from './ArrearsActionForm.tsx';

export const dynamic = 'force-dynamic';

/**
 * Outstanding balances across seasons (scope 48, WP1; BR40, BR79).
 *
 * Everything else in this app scopes a figure to one season. This is the
 * deliberate exception: a debt does not stop being the club's business
 * because the season it was raised in has closed, and BR79's two-year
 * visibility window exists so it cannot quietly disappear at season
 * change. Registrar and Treasurer both read it; only admin or treasurer
 * may record a follow-up (the RLS policy on `arrears_action`, not this
 * page, is what actually enforces that).
 */
export default async function ArrearsPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/arrears');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const report = await outstandingBalances(client, tenant.clubId);

  return (
    <>
      <h2>Arrears</h2>
      <p className="lede">
        Every Person owing money from a season within the last two years, whichever season it was
        raised in (BR40, BR79). Oldest and never-chased first — a debt six weeks old that nobody
        has asked about yet is where a Treasurer&rsquo;s afternoon should start.
      </p>

      {report.kind === 'refused' ? (
        <p className="notice" style={{ margin: 0 }}>
          {report.because} <span className="hint">
            Nothing is shown rather than a partial total &mdash; a coach reading a zero here would
            be reading a confident lie.
          </span>
        </p>
      ) : (
        <>
          {report.figures.length === 0 ? (
            <p className="hint">No Person carries an outstanding balance from the last two years.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Season</th>
                  <th>Outstanding</th>
                  <th>Age</th>
                  <th>Last action</th>
                  <th>Record a follow-up</th>
                </tr>
              </thead>
              <tbody>
                {arrearsQueue(report.figures).map((row) => (
                  <tr key={`${row.personId}-${row.seasonId}`}>
                    <td>{row.personName}</td>
                    <td>{row.seasonName}</td>
                    <td>{formatCents(row.outstandingCents)}</td>
                    <td>
                      {row.ageDays} day{row.ageDays === 1 ? '' : 's'}
                      {row.neverChased && (
                        <>
                          {' '}<span className="hint">&mdash; not yet chased</span>
                        </>
                      )}
                    </td>
                    <td>
                      {row.lastAction === null
                        ? <span className="hint">none</span>
                        : (
                          <>
                            {row.lastAction === 'payment_requested' ? 'Payment requested' : 'Amendment recorded'}
                            {row.lastActionAt !== null && (
                              <> <span className="hint">({row.lastActionAt.slice(0, 10)})</span></>
                            )}
                          </>
                        )}
                    </td>
                    <td>
                      <ArrearsActionForm personId={row.personId} seasonId={row.seasonId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="hint" style={{ marginTop: 'var(--space-2)' }}>
            Computed on load, as at {report.computedAt.slice(0, 16).replace('T', ' ')}. No formal
            hardship-override process exists yet (open question #50) &mdash; recording an amendment
            here only keeps a record of what the Treasurer decided and why.
          </p>
        </>
      )}
    </>
  );
}
