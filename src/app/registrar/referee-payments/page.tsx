import { redirect } from 'next/navigation';

import {
  loadApprovedUnbatchedClaims, loadBatches, loadClaimCandidates, loadClaims,
} from '../../../data/claims.ts';
import { loadRates, loadSchedules } from '../../../data/fees.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { previewClaim } from '../../../web/claim-view.ts';
import { standings } from '../../../web/fee-schedule-form.ts';
import { AddApprovedToBatch, BatchCard, ClaimCandidateRow, DecideClaimRow, NewBatch } from './PaymentForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * Raising, approving, batching and paying referee claims (scope 34,
 * WP1/WP3/WP4; the screen in [scope 56](../../../../docs/scope/56_working_from_a_list_rather_than_a_spreadsheet.md)).
 *
 * Every rule here is the database's — this page only shows what it will
 * accept and translates what it refuses. Raising and deciding are kept as
 * separate acts on the page the way BR119 keeps verifying and being paid
 * apart, and the way open question #71 keeps raising and approving apart:
 * a coordinator raises, a treasurer decides.
 */
export default async function RefereePaymentsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Freferee-payments');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const mayRaise = tenant.roles.some((r) => ['admin', 'registrar', 'coordinator'].includes(r));
  const mayDecide = tenant.roles.some((r) => ['admin', 'treasurer'].includes(r));

  if (!mayRaise && !mayDecide) {
    return (
      <>
        <h2>Match official payments</h2>
        <p className="notice">
          <strong>Only an administrator, registrar, coordinator or treasurer can see this.</strong>{' '}
          You are signed in as {tenant.roles.join(', ')} at {tenant.clubName}.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Match official payments</h2>
        <p className="lede">This club has no season yet.</p>
      </>
    );
  }

  const [candidates, claims, schedules, batches, approvedUnbatched] = await Promise.all([
    mayRaise ? loadClaimCandidates(client, tenant.clubId, season.id) : Promise.resolve([]),
    loadClaims(client, tenant.clubId, season.id),
    loadSchedules(client, tenant.clubId),
    mayDecide ? loadBatches(client, tenant.clubId) : Promise.resolve([]),
    mayDecide ? loadApprovedUnbatchedClaims(client, tenant.clubId, season.id) : Promise.resolve([]),
  ]);

  const raisable = candidates.filter((c) => c.claimable.kind === 'yes');
  const openBatch = batches.find((b) => b.paidAt === null && b.closedAt === null);

  return (
    <>
      <h2>Match official payments</h2>
      <p className="lede">
        Every rule about referee money runs in the database (BR13&ndash;BR18, BR116&ndash;BR119) &mdash;
        this page shows what it will accept and never offers what it will refuse.
      </p>

      {mayRaise && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Verified matches ready to claim</h3>
          {raisable.length === 0 ? (
            <p className="hint" style={{ marginBottom: 0 }}>
              Nothing to claim for yet. A match has to be <a href="/registrar/verification">verified</a> first.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Official</th>
                  <th>Match</th>
                  <th>Pays</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {await Promise.all(raisable.map(async (c) => {
                  const inForce = standings(schedules, c.playedOn).find((s) => s.standing !== 'future');
                  const rates = inForce === undefined ? [] : await loadRates(client, tenant.clubId, inForce.id);
                  const preview = previewClaim(c, rates);
                  return <ClaimCandidateRow key={c.appointmentId} seasonId={season.id} candidate={c} preview={preview} />;
                }))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {mayDecide && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Claims to decide</h3>
          {claims.filter((c) => c.state === 'raised').length === 0 ? (
            <p className="hint" style={{ marginBottom: 0 }}>Nothing waiting on a decision.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Official</th>
                  <th>Match</th>
                  <th>Amount</th>
                  <th>State</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {claims.filter((c) => c.state === 'raised').map((c) => (
                  <DecideClaimRow key={c.id} claim={c} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {mayDecide && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Payment runs</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            A payment run groups approved claims so they can be paid together. Add claims to it, then{' '}
            <b>close it</b> once the group is final &mdash; a closed run&rsquo;s total is fixed and admits
            no more claims (BR117). Once you&rsquo;ve actually paid it, outside the platform, come back and{' '}
            <b>record it as paid</b> (BR118) &mdash; this screen never sends money itself.
          </p>
          <NewBatch />
          <div className="stack">
            {batches.map((b) => (
              <BatchCard key={b.id} batch={b} />
            ))}
            {batches.length > 0 && (
              <div className="card">
                <h4 style={{ marginTop: 0 }}>Add approved claims to the open payment run</h4>
                {openBatch === undefined ? (
                  <p className="hint" style={{ marginBottom: 0 }}>
                    No open payment run &mdash; start one above.
                  </p>
                ) : (
                  <AddApprovedToBatch batchId={openBatch.id} approved={approvedUnbatched} />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
