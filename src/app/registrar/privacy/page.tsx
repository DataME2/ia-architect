import { notFound, redirect } from 'next/navigation';

import { loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadErasureRequests, loadRetentionReviews } from '../../../data/privacy.ts';
import { awaitingDecision, groupReviews } from '../../../web/privacy-view.ts';
import {
  DecideRequestForm,
  DisposeForm,
  RecordBasisForm,
  RecordRequestForm,
  RunReviewForm,
  TransferAuthorityForm,
} from './PrivacyForms.tsx';

export const dynamic = 'force-dynamic';

/**
 * Forgetting, and the reasons not to (scope 37).
 *
 * The screen is arranged so the **irreversible** things are hardest to do
 * by accident: a disposal sits under its own warning, in its own group, and
 * every other retention state is shown without an action beside it. A life
 * member listed with the same affordance as a lapsed player is how a club
 * deletes its own history.
 */
export default async function PrivacyPage() {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/privacy');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const [requests, reviews] = await Promise.all([
    loadErasureRequests(client, tenant.clubId),
    loadRetentionReviews(client, tenant.clubId),
  ]);

  const groups = groupReviews(reviews.map((r) => ({
    id: r.id, personName: r.personName, state: r.state, detail: r.detail,
  })));
  const outstanding = awaitingDecision(requests);
  const isAdmin = tenant.roles.includes('admin');

  return (
    <>
      <h2>Privacy rights</h2>
      <p className="lede">
        What the club must keep, what it may delete, and the requests it has been asked to answer.
        {outstanding > 0 && <strong> {outstanding} request{outstanding === 1 ? '' : 's'} awaiting a decision.</strong>}
      </p>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Erasure requests (BR49)</h3>
        {requests.length === 0 ? (
          <p className="empty">No one has asked to be forgotten.</p>
        ) : (
          <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
            {requests.map((r) => (
              <li key={r.id} className="stack">
                <div>
                  <strong>{r.personName}</strong> — asked {r.requestedAt.slice(0, 10)}
                  {r.requestDetail !== null && <> · &ldquo;{r.requestDetail}&rdquo;</>}
                </div>

                {r.state === 'received' ? (
                  isAdmin
                    ? <DecideRequestForm requestId={r.id} />
                    : <p className="hint" style={{ margin: 0 }}>Only an administrator may answer this.</p>
                ) : r.state === 'refused' ? (
                  <p className="hint" style={{ margin: 0 }}>
                    <strong>Refused.</strong>{' '}
                    {r.refusedBases.map((b) => b.basis.replace(/_/g, ' ')).join(', ')}
                    {r.honourableFrom === null
                      ? ' — with no end date, so this does not become possible later.'
                      : ` — erasable from ${r.honourableFrom}.`}
                  </p>
                ) : (
                  <p className="hint" style={{ margin: 0 }}>
                    <strong>{r.state === 'honoured' ? 'Erased.' : 'Withdrawn.'}</strong>{' '}
                    {r.state === 'honoured' && 'The record is gone; this request names nobody (BR132).'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Retention (BR40)</h3>
        <RunReviewForm />

        {groups.length === 0 ? (
          <p className="empty" style={{ marginTop: 'var(--space-3)' }}>
            Nothing reviewed yet. Run a review to see where each record stands.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.state} style={{ marginTop: 'var(--space-4)' }}>
              <h4 style={{ marginBottom: 'var(--space-2)' }}>
                {group.label} <span className="hint">({group.rows.length})</span>
              </h4>
              <ul className="stack" style={{ listStyle: 'none', padding: 0 }}>
                {group.rows.map((row) => (
                  <li key={row.id}>
                    <div><strong>{row.personName}</strong></div>
                    {row.detail !== null && <p className="hint" style={{ margin: 0 }}>{row.detail}</p>}
                    {group.actionable && isAdmin && (
                      <DisposeForm reviewId={row.id} personName={row.personName} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Reasons a record must be kept</h3>
        <p className="hint">
          A refusal can only name a reason that has been recorded. Recording one here is what turns
          &ldquo;no&rdquo; into &ldquo;no, until this date&rdquo;.
        </p>
        <RecordBasisForm />
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Record a request</h3>
        <RecordRequestForm />
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Authority at eighteen (BR67)</h3>
        <TransferAuthorityForm />
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>The club&rsquo;s own copy (BR68)</h3>
        <p className="hint">
          Everything this club holds, as one file. The club owns its data and may take it
          elsewhere — this is that promise, cashed.
        </p>
        {isAdmin
          ? <a href="/registrar/privacy/export">Download everything</a>
          : <p className="hint" style={{ margin: 0 }}>Only an administrator may export the club&rsquo;s data.</p>}
      </section>
    </>
  );
}
