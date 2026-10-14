'use client';

import { useMemo, useState } from 'react';

import {
  byMonth,
  exportFileName,
  exportRows,
  filterFixtures,
  monthGrid,
  monthName,
  resultLabel,
  toCsv,
  toSpreadsheetXml,
  yearsOf,
  type CalendarFixture,
} from '../../web/competition-calendar.ts';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function download(name: string, type: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function side(homeAway: string): string {
  return homeAway === 'home' ? 'v' : homeAway === 'away' ? 'at' : 'vs';
}

/**
 * The competition by calendar year and team (scope 99). Choose a year and a
 * team (or every team), read it as a month grid or a list, and take it away
 * as Excel, CSV or a printed PDF. Every decision is in
 * `src/web/competition-calendar.ts`; the files are built in the browser from
 * exactly what is on screen, so nothing is fetched or stored to export.
 */
export function CompetitionCalendar({
  clubName,
  fixtures,
  teams,
  today,
  fixedTeamId = null,
}: {
  readonly clubName: string;
  readonly fixtures: readonly CalendarFixture[];
  readonly teams: readonly { readonly id: string; readonly name: string }[];
  readonly today: string;
  /** A team's own calendar (in its dugout): no team filter offered. */
  readonly fixedTeamId?: string | null;
}) {
  const years = yearsOf(fixtures);
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState<number>(years.includes(thisYear) ? thisYear : years[0] ?? thisYear);
  const [teamId, setTeamId] = useState<string | null>(fixedTeamId);
  const [view, setView] = useState<'month' | 'list'>('month');
  const [month0, setMonth0] = useState<number>(Number(today.slice(5, 7)) - 1);

  const shown = useMemo(() => filterFixtures(fixtures, year, teamId), [fixtures, year, teamId]);
  const months = useMemo(() => byMonth(shown), [shown]);
  const teamName = teamId === null ? null : teams.find((t) => t.id === teamId)?.name ?? null;
  const teamIndex = new Map(teams.map((t, i) => [t.id, i]));
  const onDay = new Map<string, CalendarFixture[]>();
  for (const f of shown) onDay.set(f.playedOn, [...(onDay.get(f.playedOn) ?? []), f]);
  const played = shown.filter((f) => f.goalsFor !== null && f.goalsAgainst !== null);
  const won = played.filter((f) => f.goalsFor! > f.goalsAgainst!).length;
  const drawn = played.filter((f) => f.goalsFor === f.goalsAgainst).length;
  const fileName = exportFileName(clubName, year, teamName);

  const printPdf = () => {
    document.documentElement.classList.add('print-calendar');
    const done = () => {
      document.documentElement.classList.remove('print-calendar');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  return (
    <section className="comp-cal" aria-label="Competition calendar">
      <header className="comp-cal-head">
        <div>
          <p className="eyebrow">Competition calendar</p>
          <h3 style={{ margin: 0 }}>
            {year}
            {teamName !== null && ` · ${teamName}`}
          </h3>
          <p className="hint" style={{ margin: 0 }}>
            {shown.length} {shown.length === 1 ? 'fixture' : 'fixtures'} &middot; {played.length} played &middot; {won} won,{' '}
            {drawn} drawn, {played.length - won - drawn} lost
          </p>
        </div>
        <div className="comp-cal-controls">
          <label>
            Year{' '}
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {(years.length === 0 ? [thisYear] : years).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {fixedTeamId === null && (
            <label>
              Team{' '}
              <select value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value === '' ? null : e.target.value)} aria-label="Team">
                <option value="">Every team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="dugout-formations" role="group" aria-label="View">
            <button type="button" className={view === 'month' ? 'is-on' : undefined} aria-pressed={view === 'month'} onClick={() => setView('month')}>
              Month
            </button>
            <button type="button" className={view === 'list' ? 'is-on' : undefined} aria-pressed={view === 'list'} onClick={() => setView('list')}>
              List
            </button>
          </div>
        </div>
      </header>

      <div className="comp-cal-export" role="group" aria-label="Export">
        <button
          type="button"
          className="secondary"
          onClick={() => download(`${fileName}.xls`, 'application/vnd.ms-excel', toSpreadsheetXml(exportRows(shown), teamName ?? String(year)))}
        >
          Excel
        </button>
        <button type="button" className="secondary" onClick={() => download(`${fileName}.csv`, 'text/csv;charset=utf-8', toCsv(exportRows(shown)))}>
          CSV
        </button>
        <button type="button" className="secondary" onClick={printPdf}>
          PDF
        </button>
      </div>

      {view === 'month' ? (
        <div className="comp-cal-month">
          <div className="comp-cal-nav">
            <button type="button" className="secondary" aria-label="Previous month" disabled={month0 === 0} onClick={() => setMonth0(month0 - 1)}>
              &lsaquo;
            </button>
            <b>
              {monthName(month0)} {year}
            </b>
            <button type="button" className="secondary" aria-label="Next month" disabled={month0 === 11} onClick={() => setMonth0(month0 + 1)}>
              &rsaquo;
            </button>
          </div>
          <table className="comp-cal-grid">
            <thead>
              <tr>
                {WEEKDAYS.map((d) => (
                  <th key={d} scope="col">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid(year, month0).map((week, w) => (
                <tr key={w}>
                  {week.map((day, d) => (
                    <td key={d} className={day === today ? 'is-today' : day === null ? 'is-out' : undefined}>
                      {day !== null && (
                        <>
                          <span className="day">{Number(day.slice(8))}</span>
                          {(onDay.get(day) ?? []).map((f) => (
                            <span
                              key={f.id}
                              className={`comp-cal-chip${f.status === 'cancelled' ? ' is-off' : ''}`}
                              style={{ ['--team' as string]: `var(--team-${(teamIndex.get(f.teamId ?? '') ?? 0) % 6})` }}
                              title={`${f.teamName} ${side(f.homeAway)} ${f.opponent}${f.kickOff ? `, ${f.kickOff.slice(0, 5)}` : ''}`}
                            >
                              {teamId === null && <b>{f.teamName}</b>} {side(f.homeAway)} {f.opponent}
                              {resultLabel(f) !== '' && <em> {resultLabel(f)}</em>}
                            </span>
                          ))}
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* The list: the view when chosen, and always what a PDF prints. */}
      <div className={view === 'list' ? 'comp-cal-list' : 'comp-cal-list print-only'}>
        {months.length === 0 ? (
          <p className="empty">No fixtures in {year}.</p>
        ) : (
          months.map((m) => (
            <div key={m.month0}>
              <h4>{m.label}</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Team</th>
                      <th>Fixture</th>
                      <th>Competition</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.fixtures.map((f) => (
                      <tr key={f.id}>
                        <td>
                          {f.playedOn}
                          {f.kickOff !== null && <span className="hint"> {f.kickOff.slice(0, 5)}</span>}
                        </td>
                        <td>{f.teamName}</td>
                        <td>
                          {side(f.homeAway)} {f.opponent}
                          {f.venue !== null && <span className="hint"> &middot; {f.venue}</span>}
                        </td>
                        <td>{f.competition ?? <span className="hint">&mdash;</span>}</td>
                        <td>{resultLabel(f) || <span className="hint">&mdash;</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
