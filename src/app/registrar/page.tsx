import { redirect } from 'next/navigation';

import { loadQueue, loadSeasons, loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { totalOwed } from '../../domain/finance/eligibility.ts';
import { formatMoney } from '../../domain/finance/money.ts';
import {
  blockerSummary,
  eligibilityOf,
  failing,
  groupQueue,
  moneyNote,
  owing,
  unpaidButRegistered,
  type QueueEntry,
} from '../../web/queue-view.ts';
import { todayIn } from '../../web/today.ts';
import { RuleList, StatusPill } from '../_components/rules.tsx';

export const dynamic = 'force-dynamic';

function QueueCard({ entry }: { readonly entry: QueueEntry }) {
  const blocking = failing(entry);
  const money = moneyNote(entry);
  const eligibility = eligibilityOf(entry);

  return (
    <article className="card">
      <div className="card-row">
        <div>
          <p className="name">
            <a href={`/registrar/${entry.registrationId}`}>{entry.displayName}</a>
          </p>
          <p className="legal-name">Legal name: {entry.legalName}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {money !== null && (
            <span className={entry.outstandingCents > 0 ? 'pill pill-stop' : 'pill pill-ok'}>
              {money}
            </span>
          )}
          <StatusPill status={entry.status} />
        </div>
      </div>

      {!eligibility.mayPlay && eligibility.blockedBy === 'owes-money' && (
        <p className="notice" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          <strong>Cannot take the field.</strong> {eligibility.reason} Registered with the
          federation, so every other screen reports this one as finished &mdash; it is not.
        </p>
      )}

      {entry.duplicateCount > 0 && (
        <p className="notice" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
          {entry.duplicateCount === 1
            ? '1 possible duplicate needs a human decision (BR5).'
            : `${entry.duplicateCount} possible duplicates need a human decision (BR5).`}{' '}
          A pack excludes them rather than guessing.
        </p>
      )}

      <RuleList outcomes={blocking} />
    </article>
  );
}

function Section({
  title,
  entries,
  emptyText,
}: {
  readonly title: string;
  readonly entries: readonly QueueEntry[];
  readonly emptyText: string;
}) {
  return (
    <section>
      <h2>
        {title} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        entries.map((entry) => <QueueCard key={entry.registrationId} entry={entry} />)
      )}
    </section>
  );
}

export default async function RegistrarPage({
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
        <p className="lede">
          This account is signed in but is not a member of any club, so there is nothing to
          show. Row-Level Security gives the same answer to a stranger as to an empty club —
          which is the correct answer to give a stranger.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>{tenant.clubName}</h2>
        <p className="lede">No seasons are configured yet. A registration is scoped to one.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;
  const entries = await loadQueue(client, tenant.clubId, season.id, todayIn());
  const grouped = groupQueue(entries);
  const summary = blockerSummary(entries);
  const unpaid = unpaidButRegistered(entries);
  const debtors = owing(entries);

  return (
    <>
      <h2>
        {tenant.clubName} — {season.name}
      </h2>
      <p className="lede">
        Every registration this season, with what is blocking it. Rules are evaluated fresh on
        each load and the result is what the submission pack is built from.
      </p>

      {seasons.length > 1 && (
        <form method="get" className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'end' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="season">Season</label>
            <select id="season" name="season" defaultValue={season.id}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="secondary">
            Show
          </button>
        </form>
      )}

      <div className="summary-grid">
        <div className="stat">
          <span className="n">{entries.length}</span>
          <span className="label">registrations</span>
        </div>
        <div className="stat">
          <span className="n">{grouped.needsAction.length}</span>
          <span className="label">need action</span>
        </div>
        <div className="stat">
          <span className="n">{grouped.readyToSubmit.length}</span>
          <span className="label">ready to submit</span>
        </div>
        <div className="stat">
          <span className="n">{grouped.awaitingFederation.length}</span>
          <span className="label">sent, not registered</span>
        </div>
        <div className="stat">
          <span className="n">{formatMoney(totalOwed(debtors))}</span>
          <span className="label">
            owed by {debtors.length} {debtors.length === 1 ? 'family' : 'families'}
          </span>
        </div>
      </div>

      {unpaid.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>
            Registered, but cannot play &mdash; {formatMoney(totalOwed(unpaid))} owed (BR79)
          </h3>
          <p className="hint" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            No pay, no play. {unpaid.length === 1 ? 'This player is' : 'These players are'}{' '}
            confirmed by the federation, so BR43 is satisfied and the status stays{' '}
            <strong>COMPLETE</strong> &mdash; the club may not revoke an eligibility the
            federation conferred. Every other screen therefore reports them as finished. They
            still owe money, and a coach picking from the Registered list would field them.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((entry) => (
                  <tr key={entry.registrationId}>
                    <td>
                      <a href={`/registrar/${entry.registrationId}?season=${season.id}`}>
                        {entry.displayName}
                      </a>
                    </td>
                    <td>{formatMoney(entry.outstandingCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summary.length > 0 && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>What is holding the season up</h3>
          <p className="hint" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
            Counted per rule. This is the decomposition open question #32 asks for — the club
            has never been able to say which part of the delay is which, because nobody kept
            the failure history.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Registrations</th>
                  <th>Example</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.ruleId}>
                    <td>
                      <span className="rule-id">{row.ruleId}</span>
                    </td>
                    <td>{row.count}</td>
                    <td>{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Section
        title="Needs action"
        entries={grouped.needsAction}
        emptyText="Nothing is blocked."
      />
      <Section
        title="Ready to submit"
        entries={grouped.readyToSubmit}
        emptyText="Nothing is waiting to be packed."
      />
      <Section
        title="Sent — not yet registered"
        entries={grouped.awaitingFederation}
        emptyText="Nothing has been handed over yet."
      />
      <Section
        title="Registered"
        entries={grouped.complete}
        emptyText="No player has been confirmed by the federation yet."
      />
    </>
  );
}
