import type { Report } from '../../../domain/reporting/types.ts';
import {
  BILLS_PER_PAGE, CATEGORY_LABEL, collectionRate, compactCents, componentRows, delta, money, monthColumns,
  percent, previousSeason, seasonBars, sortTeams, type BillsPage, type FinanceReport as Figures,
  type FinanceSeason, type TeamSort,
} from '../../../web/finance-report.ts';
import { ChartTips } from './ChartTips.tsx';

export interface FinanceQuery {
  readonly team: string | null;
  readonly owing: boolean;
  readonly search: string | null;
  readonly page: number;
  readonly sort: TeamSort;
}

/**
 * The finance report (scope 133): every season the club holds, then the
 * chosen one's figures, what its bills were made of, when they went out,
 * its teams and its bills. Every filter is a link or a GET form, so a view
 * can be bookmarked and Back works; one season scopes everything below.
 */
export function FinanceReport({
  report, season, bills, query, href,
}: {
  readonly report: Figures;
  readonly season: FinanceSeason;
  readonly bills: Report<BillsPage>;
  readonly query: FinanceQuery;
  readonly href: (over: Record<string, string | null>) => string;
}) {
  const before = previousSeason(report.seasons, season);
  const rate = collectionRate(season.collected, season.invoiced);
  const teams = sortTeams(season.teams, query.sort);
  const { columns, ticks } = monthColumns(season.months);
  const components = componentRows(season.components);

  const tiles = [
    { label: 'Billed', value: money(season.invoiced), change: delta(season.invoiced, before?.invoiced ?? null, true) },
    { label: 'Collected', value: money(season.collected), change: delta(season.collected, before?.collected ?? null, true) },
    { label: 'Outstanding', value: money(season.outstanding), change: delta(season.outstanding, before?.outstanding ?? null, false) },
    { label: 'Collection rate', value: percent(rate), change: null },
    { label: season.imported ? 'Invoices' : 'Registrations', value: season.bills.toLocaleString('en-AU'), change: null,
      note: `${season.owing.toLocaleString('en-AU')} still owing` },
  ];

  return (
    <ChartTips>
      <div className="fin stack">
        <div className="fin-filters" role="group" aria-label="Which season">
          <nav className="segmented" aria-label="Season">
            {report.seasons.map((s) => (
              <a key={s.id} href={href({ season: s.id, team: null, page: null })} aria-current={s.id === season.id ? 'page' : undefined}>
                {s.name}
              </a>
            ))}
          </nav>
          <span className={`pill ${season.imported ? 'pill-info' : 'pill-ok'}`}>
            {season.imported ? 'Imported history' : 'Live in PitchPeople'}
          </span>
        </div>

        {season.bills === 0 ? (
          <p className="notice">{season.name} has billed nobody yet. Choose another season above.</p>
        ) : (
          <>
            <div className="fin-tiles">
              {tiles.map((t) => (
                <div key={t.label} className="stat">
                  <p className="label">{t.label}</p>
                  <span className="n">{t.value}</span>
                  {t.change !== null && before !== null && (
                    <span className={`fin-delta fin-delta--${t.change.tone}`}>{t.change.text} on {before.name}</span>
                  )}
                  {'note' in t && <span className="fin-delta">{t.note}</span>}
                </div>
              ))}
            </div>

            <section className="card" aria-labelledby="fin-seasons">
              <h3 id="fin-seasons" style={{ marginTop: 0 }}>Every season</h3>
              <p className="hint">Each bar is a season&rsquo;s bills: what came in, then what is still owed. Choose a season to look inside it.</p>
              <ul className="fin-legend" aria-label="Legend">
                <li><span className="fin-key fin-key--collected" aria-hidden="true" />Collected</li>
                <li><span className="fin-key fin-key--outstanding" aria-hidden="true" />Outstanding</li>
              </ul>
              <ol className="fin-bars">
                {seasonBars(report.seasons).map(({ season: s, collectedPct, outstandingPct }) => (
                  <li key={s.id}>
                    <a
                      href={href({ season: s.id, team: null, page: null })}
                      className="fin-bar-row"
                      aria-current={s.id === season.id ? 'true' : undefined}
                      aria-label={`${s.name}: ${money(s.invoiced)} billed, ${money(s.collected)} collected, ${money(s.outstanding)} outstanding`}
                    >
                      <span className="fin-bar-name">{s.name}</span>
                      <span className="fin-bar-track">
                        {s.collected > 0 && (
                          <span className={`fin-seg fin-seg--collected${s.outstanding > 0 ? '' : ' fin-seg--end'}`} style={{ width: `${collectedPct}%` }}
                            data-tip={`${money(s.collected)}|Collected in ${s.name}|${percent(collectionRate(s.collected, s.invoiced))} of what was billed`} />
                        )}
                        {s.outstanding > 0 && (
                          <span className="fin-seg fin-seg--outstanding fin-seg--end" style={{ width: `max(${outstandingPct}%, 4px)` }}
                            data-tip={`${money(s.outstanding)}|Outstanding in ${s.name}|${s.owing} ${s.owing === 1 ? 'bill' : 'bills'} still owing`} />
                        )}
                        <span className="fin-bar-total">{s.bills === 0 ? 'nothing billed' : compactCents(s.invoiced)}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            <div className="cols">
              <section className="card" aria-labelledby="fin-made-of">
                <h3 id="fin-made-of" style={{ marginTop: 0 }}>What {season.name}&rsquo;s bills were made of</h3>
                <ul className="fin-hbars">
                  {components.map((c) => (
                    <li key={c.key}>
                      <span className="fin-hbar-label">{c.label}</span>
                      <span className="fin-hbar-track">
                        <span className={`fin-hbar${c.reduces ? ' fin-hbar--reduces' : ''}`} style={{ width: `${c.pct}%` }}
                          tabIndex={0} role="img" aria-label={`${c.label}: ${money(c.cents)}`}
                          data-tip={`${money(c.cents)}|${c.label}|${percent(season.invoiced > 0 ? Math.abs(c.cents) / season.invoiced : null)} of the season's bills`} />
                      </span>
                      <span className="fin-hbar-value">{money(c.cents)}</span>
                    </li>
                  ))}
                </ul>
                <p className="hint">
                  {season.imported
                    ? 'Each invoice line, sorted as the club’s own Power BI model sorts it. A sibling discount takes money off.'
                    : 'Each registration’s latest pricing from the fee schedule (BR195). A sibling discount takes money off.'}
                </p>
              </section>

              <section className="card" aria-labelledby="fin-months">
                <h3 id="fin-months" style={{ marginTop: 0 }}>When the bills went out</h3>
                <div className="fin-cols-chart">
                  <ol className="fin-axis" aria-hidden="true">
                    {[...ticks].reverse().map((t) => <li key={t}>{compactCents(t)}</li>)}
                  </ol>
                  <ol className="fin-cols" aria-label={`Billed each month of ${season.name}`}>
                    {columns.map((c) => (
                      <li key={c.month}>
                        <span className="fin-col-plot">
                          <span className="fin-col" style={{ height: `${c.heightPct}%` }} tabIndex={0} role="img"
                            aria-label={`${c.label}: ${money(c.cents)} across ${c.count} ${c.count === 1 ? 'bill' : 'bills'}`}
                            data-tip={`${money(c.cents)}|Billed in ${c.label}|${c.count} ${c.count === 1 ? 'bill' : 'bills'}`} />
                        </span>
                        <span className="fin-col-label">{c.label.split(' ')[0]}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <details className="fin-table-view">
                  <summary>Show as a table</summary>
                  <table>
                    <thead><tr><th scope="col">Month</th><th scope="col">Billed</th><th scope="col">Bills</th></tr></thead>
                    <tbody>
                      {columns.map((c) => (
                        <tr key={c.month}><td>{c.label}</td><td className="num">{money(c.cents)}</td><td className="num">{c.count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
            </div>

            <section className="card" aria-labelledby="fin-teams">
              <h3 id="fin-teams" style={{ marginTop: 0 }}>Teams in {season.name}</h3>
              <p className="hint">
                A family&rsquo;s bill is shared between its players&rsquo; teams by its lines, and so are its payments and its
                balance (BR199). Choose a team to see its bills.
              </p>
              <div className="table-scroll">
                <table className="fin-teams">
                  <thead>
                    <tr>
                      {([['team', 'Team'], ['players', 'Players'], ['invoiced', 'Billed'], ['collected', 'Collected'],
                        ['outstanding', 'Outstanding'], ['rate', 'Collected share']] as [TeamSort, string][]).map(([key, label]) => (
                        <th key={key} scope="col" aria-sort={query.sort === key ? (key === 'team' ? 'ascending' : 'descending') : undefined}>
                          <a href={href({ sort: key })}>{label}{query.sort === key ? (key === 'team' ? ' ↑' : ' ↓') : ''}</a>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => {
                      const share = collectionRate(t.collected, t.invoiced);
                      return (
                        <tr key={t.team} aria-current={query.team === t.team ? 'true' : undefined}>
                          <th scope="row">
                            <a href={href({ team: query.team === t.team ? null : t.team, page: null })}>{t.team}</a>
                            {t.category && <span className="hint"> · {t.category}</span>}
                          </th>
                          <td className="num">{t.players}</td>
                          <td className="num">{money(t.invoiced)}</td>
                          <td className="num">{money(t.collected)}</td>
                          <td className="num">{money(t.outstanding)}</td>
                          <td>
                            <span className="fin-meter" role="img" aria-label={`${percent(share)} collected`}
                              data-tip={`${percent(share)}|collected by ${t.team}|${money(t.outstanding)} outstanding`}>
                              <span className="fin-seg fin-seg--collected" style={{ width: `${(share ?? 0) * 100}%` }} />
                            </span>
                            <span className="fin-meter-value">{percent(share)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <Bills season={season} bills={bills} query={query} href={href} />
          </>
        )}
        <p className="hint">
          As at {report.computedAt.slice(0, 16).replace('T', ' ')}, computed on load. Imported seasons are the club&rsquo;s
          record of what was billed and paid; nothing here is chased (BR90).
        </p>
      </div>
    </ChartTips>
  );
}

function Bills({
  season, bills, query, href,
}: {
  readonly season: FinanceSeason;
  readonly bills: Report<BillsPage>;
  readonly query: FinanceQuery;
  readonly href: (over: Record<string, string | null>) => string;
}) {
  return (
    <section className="card" aria-labelledby="fin-bills">
      <h3 id="fin-bills" style={{ marginTop: 0 }}>
        {season.imported ? 'Invoices' : 'Registrations'} in {season.name}{query.team !== null && <> &middot; {query.team}</>}
      </h3>
      <form method="get" className="fin-bill-filters">
        <input type="hidden" name="season" value={season.id} />
        <input type="hidden" name="sort" value={query.sort} />
        <label>
          <span>Team</span>
          <select name="team" defaultValue={query.team ?? ''}>
            <option value="">Every team</option>
            {season.teams.map((t) => <option key={t.team} value={t.team}>{t.team}</option>)}
          </select>
        </label>
        <label>
          <span>Find a family, player or reference</span>
          <input type="search" name="q" defaultValue={query.search ?? ''} />
        </label>
        <label className="fin-check">
          <input type="checkbox" name="owing" value="1" defaultChecked={query.owing} />
          <span>Only those still owing</span>
        </label>
        <button type="submit" className="secondary">Show</button>
      </form>

      {bills.kind === 'refused' ? (
        <p className="notice" style={{ margin: 0 }}>
          {bills.because} The figures above are the season&rsquo;s totals, which the committee may read; a family&rsquo;s bills
          are for the admin and the treasurer (BR78).
        </p>
      ) : bills.figures.total === 0 ? (
        <p className="empty" style={{ margin: 0 }}>Nothing matches.</p>
      ) : (
        <>
          <ul className="fin-bills">
            {bills.figures.rows.map((b) => (
              <li key={b.id}>
                <details>
                  <summary>
                    <span className="fin-bill-who">
                      <strong>{b.payer ?? 'Unknown family'}</strong>
                      <span className="hint">
                        {b.players.map((p) => `${p.name} (${p.team})`).join(', ') || 'No player named'}
                      </span>
                    </span>
                    <span className="fin-bill-when hint">{b.reference ?? 'Registration'} · {b.billedOn}</span>
                    <span className="num">{money(b.invoiced)}</span>
                    <span className="num">{money(b.paid)}</span>
                    <span className={`num ${b.outstanding > 0 ? 'fin-owed' : ''}`}>
                      {b.outstanding > 0 ? `${money(b.outstanding)} owed` : 'Paid'}
                    </span>
                  </summary>
                  <table className="fin-lines">
                    <thead><tr><th scope="col">Line</th><th scope="col">Player</th><th scope="col">Kind</th><th scope="col">Amount</th></tr></thead>
                    <tbody>
                      {b.lines.map((l, i) => (
                        <tr key={i}>
                          <td>{l.description}</td>
                          <td>{l.player ?? '—'}</td>
                          <td>{CATEGORY_LABEL[l.category]}</td>
                          <td className="num">{money(l.cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="hint" style={{ margin: 0 }}>
                    {b.payments} {b.payments === 1 ? 'payment' : 'payments'}
                    {b.lastPaidOn !== null && <>, the last on {b.lastPaidOn}</>}
                    {b.credits > 0 && <> · {money(b.credits)} in credits</>}
                  </p>
                </details>
              </li>
            ))}
          </ul>
          <nav className="fin-pager" aria-label="Pages of bills">
            <span className="hint">
              {(query.page - 1) * BILLS_PER_PAGE + 1}–{Math.min(query.page * BILLS_PER_PAGE, bills.figures.total)} of{' '}
              {bills.figures.total.toLocaleString('en-AU')}
            </span>
            {query.page > 1 && <a className="button secondary" href={href({ page: String(query.page - 1) })}>Previous</a>}
            {query.page * BILLS_PER_PAGE < bills.figures.total && (
              <a className="button secondary" href={href({ page: String(query.page + 1) })}>Next</a>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
