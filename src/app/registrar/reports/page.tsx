import { notFound, redirect } from 'next/navigation';

import { Tabs } from '../../../components/ui/Tabs.tsx';
import { loadFinanceBills, loadFinanceReport } from '../../../data/finance-report.ts';
import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { financeSummary, officiatingSummary, registrationSummary } from '../../../data/reporting.ts';
import {
  financeReport, officiatingReport, registrationReport,
} from '../../../domain/reporting/summary.ts';
import type { Report } from '../../../domain/reporting/types.ts';
import type { BillsPage } from '../../../web/finance-report.ts';
import { billsPage, parseTeamSort, pickSeason } from '../../../web/finance-report.ts';
import { formatCents } from '../../../web/money.ts';
import { FinanceReport } from './FinanceReport.tsx';

export const dynamic = 'force-dynamic';

/**
 * The numbers a committee acts on (scope 42), under Money since scope 133.
 *
 * Two views. **Finance** is every season the club holds, imported or live,
 * and inside the chosen one its teams and its bills (scope 133). **Season
 * summary** is the three summaries of scope 42, for one season.
 *
 * A report a reader may not have says so (BR142): it is never rendered as a
 * total of whatever rows they could see, because Row-Level Security hides
 * rows and does not refuse sums, and a coach shown **$0 outstanding** would
 * be reading a confident lie that looks like good news.
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

type Params = {
  readonly season?: string;
  readonly view?: string;
  readonly team?: string;
  readonly owing?: string;
  readonly q?: string;
  readonly page?: string;
  readonly sort?: string;
};

export default async function ReportsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Params>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=/registrar/reports');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) notFound();

  const params = await searchParams;
  const view = params.view === 'summary' ? 'summary' : 'finance';

  const link = (over: Record<string, string | null>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...over })) if (v !== null && v !== undefined && v !== '') q.set(k, v);
    const s = q.toString();
    return `/registrar/reports${s === '' ? '' : `?${s}`}`;
  };
  const tabs = (
    <Tabs
      items={[
        { id: 'finance', label: 'Finance', href: link({ view: null, page: null }) },
        { id: 'summary', label: 'Season summary', href: link({ view: 'summary', page: null }) },
      ]}
      current={view}
      label="Reports"
      className="club-tabs"
    />
  );

  if (view === 'finance') {
    const report = await loadFinanceReport(client, tenant.clubId);
    if (report.kind === 'refused') {
      return (
        <>
          <h2>Reports</h2>
          {tabs}
          <div className="tab-panel"><Refused because={report.because} /></div>
        </>
      );
    }
    const season = pickSeason(report.figures.seasons, params.season);
    if (season === null) {
      return (
        <>
          <h2>Reports</h2>
          {tabs}
          <p className="notice">This club has no season yet, and every figure here is scoped to one.</p>
        </>
      );
    }
    const team = season.teams.some((t) => t.team === params.team) ? params.team ?? null : null;
    const search = (params.q ?? '').trim() === '' ? null : (params.q ?? '').trim().slice(0, 100);
    const owing = params.owing === '1';
    const first: Report<BillsPage> = await loadFinanceBills(client, tenant.clubId, season.id, { team, owing, search, page: 1 });
    const page = first.kind === 'ready' ? billsPage(params.page, first.figures.total) : 1;
    const bills = page === 1 ? first : await loadFinanceBills(client, tenant.clubId, season.id, { team, owing, search, page });

    return (
      <>
        <h2>Reports &mdash; {season.name}</h2>
        <p className="lede">
          What {tenant.clubName} billed, collected and is still owed, season by season, and inside each season its
          teams and its bills.
        </p>
        {tabs}
        <div className="tab-panel">
          <FinanceReport
            report={report.figures}
            season={season}
            bills={bills}
            query={{ team, owing, search, page, sort: parseTeamSort(params.sort) }}
            href={link}
          />
        </div>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0];

  if (season === undefined) {
    return (
      <>
        <h2>Reports</h2>
        {tabs}
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
        Every figure is computed over this season alone, on load. An imported season owes nothing here, because its
        history is not a debt (BR90): its billing is under Finance.
      </p>
      {tabs}

      <div className="tab-panel">
        {seasons.length > 1 && (
          <form className="stack" style={{ marginBottom: 'var(--space-4)' }}>
            <input type="hidden" name="view" value="summary" />
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
      </div>
    </>
  );
}
