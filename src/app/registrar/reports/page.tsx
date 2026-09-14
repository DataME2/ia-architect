import { notFound, redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { financeSummary, officiatingSummary, registrationSummary } from '../../../data/reporting.ts';
import {
  financeReport, officiatingReport, registrationReport,
} from '../../../domain/reporting/summary.ts';
import type { Report } from '../../../domain/reporting/types.ts';
import { formatCents } from '../../../web/money.ts';

export const dynamic = 'force-dynamic';

/**
 * The numbers a committee acts on (scope 42).
 *
 * Three reports, and a reader may hold some and not others. A report they
 * may not have says so (BR142) — it is never rendered as a total of
 * whatever rows they could see, because Row-Level Security hides rows and
 * does not refuse sums, and a coach shown **$0 outstanding** would be
 * reading a confident lie that looks like good news.
 *
 * Every figure carries its base and the moment it was computed (BR143).
 */
function Refused({ because }: { readonly because: string }) {
  return (
    <p className="notice" style={{ margin: 0 }}>
      {because} <span className="hint">
        Nothing is shown rather than a partial total &mdash; a number computed over rows you cannot
        see would look like an answer.
      </span>
    </p>
  );
}

function AsAt({ report }: { readonly report: Report<unknown> }) {
  if (report.kind !== 'ready') return null;
  return (
    <p className="hint" style={{ marginTop: 'var(--space-2)' }}>
      As at {report.computedAt.slice(0, 16).replace('T', ' ')}, computed on load &mdash; nothing
      here is cached, so no figure can disagree with the rows beneath it.
    </p>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/reports');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Reports</h2>
        <p className="notice">This club has no season yet, and every figure here is scoped to one.</p>
      </>
    );
  }

  const [registration, finance, officiating] = await Promise.all([
    registrationSummary(client, tenant.clubId, season.id),
    financeSummary(client, tenant.clubId, season.id),
    officiatingSummary(client, tenant.clubId, season.id),
  ]);

  const reg = registration.kind === 'ready' ? registrationReport(registration.figures) : null;
  const fin = finance.kind === 'ready' ? financeReport(finance.figures) : null;
  const off = officiating.kind === 'ready' ? officiatingReport(officiating.figures) : null;

  return (
    <>
      <h2>Reports &mdash; {season.name}</h2>
      <p className="lede">
        Every figure is computed over this season alone, on load. One season is what this club has
        in the platform; a trend needs the history that C9 would bring.
      </p>

      {seasons.length > 1 && (
        <form className="stack" style={{ marginBottom: 'var(--space-4)' }}>
          <label>
            <span>Season</span>
            <select name="season" defaultValue={season.id}>
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button type="submit">Show</button>
        </form>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Registration</h3>
        {reg === null || registration.kind !== 'ready'
          ? <Refused because={registration.kind === 'refused' ? registration.because : ''} />
          : (
            <>
              <p><strong>Complete:</strong> {reg.complete.label}</p>
              <p><strong>Still outstanding:</strong> {reg.outstanding.label}</p>
              {reg.blockers.length > 0 && (
                <>
                  <h4>What the incomplete are waiting on</h4>
                  <ul className="hint">
                    {reg.blockers.map((b) => (
                      <li key={b.ruleId}>
                        <strong>{b.ruleId}</strong> &mdash; {b.count} registration{b.count === 1 ? '' : 's'}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <AsAt report={registration} />
            </>
          )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Finance</h3>
        {fin === null || finance.kind !== 'ready'
          ? <Refused because={finance.kind === 'refused' ? finance.because : ''} />
          : (
            <>
              <p><strong>Families owing:</strong> {fin.owing.label}</p>
              <p>
                <strong>Outstanding:</strong> {formatCents(fin.outstandingCents)}
                {fin.creditCents > 0 && (
                  <> &middot; <span className="hint">
                    and {formatCents(fin.creditCents)} in credits, reported apart rather than netted
                  </span></>
                )}
              </p>
              <p><strong>Overdue:</strong> {formatCents(fin.overdueCents)} &mdash; {fin.overdueShare.label} of what is outstanding</p>
              <p><strong>On a payment plan:</strong> {fin.onAPlan.label} of those who owe</p>
              <p>
                <strong>Voucher relief:</strong> {formatCents(fin.voucherReliefCents)}
                {fin.vouchersAwaitingVerification > 0 && (
                  <> &middot; <span className="hint">
                    {fin.vouchersAwaitingVerification} attached and not yet verified, which have
                    reduced nothing (BR81)
                  </span></>
                )}
              </p>
              <AsAt report={finance} />
            </>
          )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Match officials</h3>
        {off === null || officiating.kind !== 'ready'
          ? <Refused because={officiating.kind === 'refused' ? officiating.because : ''} />
          : (
            <>
              <p><strong>Accepted:</strong> {off.accepted.label}</p>
              <p><strong>Declined:</strong> {off.declined.label} &middot; <span className="hint">
                only a decline carrying a reason is recorded at all (BR112)
              </span></p>
              <p><strong>Awaiting an answer:</strong> {off.awaitingResponse}</p>
              <p><strong>Approved claims:</strong> {formatCents(off.approvedCents)}</p>
              <p><strong>Claims awaiting approval:</strong> {off.claimsAwaitingApproval}</p>
              <p>
                <strong>Matches still to verify:</strong> {off.verificationsOutstanding}
                {' '}<span className="hint">&mdash; a claim cannot be raised without one (BR13)</span>
              </p>
              <AsAt report={officiating} />
            </>
          )}
      </section>
    </>
  );
}
