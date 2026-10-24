import { redirect } from 'next/navigation';

import { loadPeopleRoleSummary, loadQueue, loadSeasons, loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { SEASON_ROLES } from '../../domain/types.ts';
import { totalOwed } from '../../domain/finance/eligibility.ts';
import { formatMoney } from '../../domain/finance/money.ts';
import { bars, share } from '../../web/dashboard-view.ts';
import { ROLE_LABEL } from '../../web/people-view.ts';
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
import { DEFAULT_TIME_ZONE, todayIn } from '../../web/today.ts';
import { StatusPill } from '../_components/rules.tsx';
import { BulkReminders } from './_components/BulkReminders.tsx';

export const dynamic = 'force-dynamic';

/**
 * One registration as a row of the dashboard's table (scope 106): the
 * player, the status, what is holding it up, and the money. Each rule's
 * message is on the registration itself, and in the rule's tooltip here.
 */
function QueueRow({ entry, seasonId }: { readonly entry: QueueEntry; readonly seasonId: string }) {
  const blocking = failing(entry);
  const money = moneyNote(entry);
  const eligibility = eligibilityOf(entry);
  const cannotPlay = !eligibility.mayPlay && eligibility.blockedBy === 'owes-money';

  return (
    <tr>
      <td>
        <a href={`/registrar/${entry.registrationId}?season=${seasonId}`}>{entry.displayName}</a>
        <span className="dash-legal">Legal name: {entry.legalName}</span>
      </td>
      <td>
        <StatusPill status={entry.status} />
      </td>
      <td>
        <span className="dash-holding">
          {blocking.map((o) => (
            <span key={o.ruleId} className="rule-id" title={o.message}>
              {o.ruleId}
            </span>
          ))}
          {/* BR5: a pack excludes these rather than guessing. */}
          {entry.duplicateCount > 0 && (
            <span className="pill pill-warn">
              {entry.duplicateCount === 1 ? '1 possible duplicate' : `${entry.duplicateCount} possible duplicates`}
            </span>
          )}
          {/* BR79: registered, so every other screen reports it finished. */}
          {cannotPlay && <span className="pill pill-stop">Cannot take the field</span>}
          {blocking.length === 0 && entry.duplicateCount === 0 && !cannotPlay && <span className="hint">Nothing</span>}
        </span>
      </td>
      <td>
        {money === null ? (
          <span className="hint">&mdash;</span>
        ) : (
          <span className={entry.owes ? 'pill pill-stop' : 'pill pill-ok'}>{money}</span>
        )}
      </td>
    </tr>
  );
}

/** One of the queue's four groups, as a headed run of rows. */
function Group({
  title,
  entries,
  emptyText,
  seasonId,
}: {
  readonly title: string;
  readonly entries: readonly QueueEntry[];
  readonly emptyText: string;
  readonly seasonId: string;
}) {
  return (
    <tbody>
      <tr className="dash-group">
        <th colSpan={4} scope="colgroup">
          {title} <span className="dash-count">({entries.length})</span>
        </th>
      </tr>
      {entries.length === 0 ? (
        <tr>
          <td colSpan={4} className="hint">
            {emptyText}
          </td>
        </tr>
      ) : (
        entries.map((entry) => <QueueRow key={entry.registrationId} entry={entry} seasonId={seasonId} />)
      )}
    </tbody>
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
    // The platform owner is *always* in this branch and is not lost. Saying
    // only "no club" to the one account that can never have one is true,
    // useless, and reads as a fault.
    const { data: isPlatform } = await client.rpc('app_is_platform');
    if (isPlatform === true) {
      return (
        <>
          <h2>You are the platform owner</h2>
          <p className="lede">
            This account holds <strong>no membership at any club</strong>, which is deliberate
            rather than missing: it is what keeps every ordinary policy denying it, and it is
            why this queue has nothing to show you. The clubs you support are on the console.
          </p>
          <p>
            <a className="button" href="/platform">
              Open the platform console
            </a>
          </p>
          <p className="hint">
            To read a club&rsquo;s own records you would need a role at that club, granted by
            its administrator, exactly as anybody else does. That is the boundary the console is
            built around, not an inconvenience to route past.
          </p>
        </>
      );
    }

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
  const [entries, people] = await Promise.all([
    loadQueue(client, tenant.clubId, season.id, todayIn()),
    loadPeopleRoleSummary(client, tenant.clubId, season.id),
  ]);
  const grouped = groupQueue(entries);
  const summary = blockerSummary(entries);
  const unpaid = unpaidButRegistered(entries);
  const debtors = owing(entries);
  const registered = share(grouped.complete.length, entries.length);
  const evaluatedAt = new Date().toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DEFAULT_TIME_ZONE,
  });

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <p className="eyebrow">Club administration</p>
          <h2>
            {tenant.clubName} — {season.name}
          </h2>
        </div>
        {/* The people directory already searches by name; this only opens it. */}
        <form method="get" action="/registrar/people" className="dash-search" role="search">
          <input type="hidden" name="season" value={season.id} />
          <label htmlFor="dash-q" className="sr-only">
            Search people
          </label>
          <input id="dash-q" name="q" type="search" placeholder="Search people…" />
          <button type="submit" className="secondary">
            Search
          </button>
        </form>
      </div>

      <div className="dash-fresh">
        <p>
          <span className="dash-fresh-dot" aria-hidden="true" />
          Rules evaluated on this load, at <span className="mono">{evaluatedAt}</span>
        </p>
        {seasons.length > 1 && (
          <form method="get" className="dash-season">
            <label htmlFor="season">Season</label>
            <select id="season" name="season" defaultValue={season.id}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button type="submit" className="secondary">
              Show
            </button>
          </form>
        )}
      </div>

      <div className="dash-metrics">
        <div className="dash-metric">
          <p className="dash-metric-label">Registrations</p>
          <p className="dash-metric-n">{entries.length}</p>
          <p className="dash-metric-note">
            {grouped.readyToSubmit.length} ready to submit · {grouped.awaitingFederation.length} sent, not yet
            registered
          </p>
        </div>
        <div className="dash-metric">
          <p className="dash-metric-label">Registered</p>
          <p className="dash-metric-n">{registered === null ? '—' : `${registered}%`}</p>
          <div className="dash-meter" aria-hidden="true">
            <span style={{ width: `${registered ?? 0}%` }} />
          </div>
          <p className="dash-metric-note">
            {grouped.complete.length} of {entries.length} confirmed by the federation
          </p>
        </div>
        <div className="dash-metric is-gold">
          <p className="dash-metric-label">Needs action</p>
          <p className="dash-metric-n">{grouped.needsAction.length}</p>
          <p className="dash-metric-alert">
            {formatMoney(totalOwed(debtors))} owed by {debtors.length}{' '}
            {debtors.length === 1 ? 'family' : 'families'}
          </p>
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
                    <td>{entry.outstandingCents === null ? 'Owes (BR78)' : formatMoney(entry.outstandingCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="dash-grid">
        <section className="dash-card" aria-labelledby="dash-registrations">
          <div className="dash-card-head">
            <h3 id="dash-registrations">Registrations</h3>
            <a href={`/registrar/pack?season=${season.id}`}>Submission pack</a>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Status</th>
                  <th scope="col">Holding it up</th>
                  <th scope="col">Money</th>
                </tr>
              </thead>
              <Group title="Needs action" entries={grouped.needsAction} emptyText="Nothing is blocked." seasonId={season.id} />
              <Group
                title="Ready to submit"
                entries={grouped.readyToSubmit}
                emptyText="Nothing is waiting to be packed."
                seasonId={season.id}
              />
              <Group
                title="Sent — not yet registered"
                entries={grouped.awaitingFederation}
                emptyText="Nothing has been handed over yet."
                seasonId={season.id}
              />
              <Group
                title="Registered"
                entries={grouped.complete}
                emptyText="No player has been confirmed by the federation yet."
                seasonId={season.id}
              />
            </table>
          </div>
        </section>

        <div className="dash-side">
          <section className="dash-card" aria-labelledby="dash-holding">
            <h3 id="dash-holding">What is holding the season up</h3>
            {summary.length === 0 ? (
              <p className="hint">No rule is failing.</p>
            ) : (
              <ul className="dash-bars">
                {bars(summary.map((row) => ({ label: row.ruleId, count: row.count }))).map((bar) => (
                  <li key={bar.label}>
                    <span className="dash-bar-label">
                      <span className="rule-id" title={summary.find((s) => s.ruleId === bar.label)?.example}>
                        {bar.label}
                      </span>
                      <b>{bar.count}</b>
                    </span>
                    <span className="dash-bar" aria-hidden="true">
                      <span style={{ width: `${bar.width}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">
              Counted per rule, so the club can say which part of the delay is which (open question #32).
            </p>
          </section>

          <section className="dash-card" aria-labelledby="dash-people">
            <h3 id="dash-people">People this season</h3>
            <ul className="dash-bars">
              {bars(SEASON_ROLES.map((role) => ({ label: ROLE_LABEL[role], count: people.byRole.get(role) ?? 0 }))).map(
                (bar) => (
                  <li key={bar.label}>
                    <span className="dash-bar-label">
                      {bar.label}
                      <b>{bar.count}</b>
                    </span>
                    <span className="dash-bar is-blue" aria-hidden="true">
                      <span style={{ width: `${bar.width}%` }} />
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="hint">
              {people.total} on record, {people.unrostered} with no role this season.
            </p>
          </section>

          <section className="dash-card" aria-labelledby="dash-actions">
            <h3 id="dash-actions">Quick actions</h3>
            <ul className="dash-actions">
              <li>
                <a href={`/registrar/invitations?season=${season.id}`}>Registration links</a>
              </li>
              <li>
                <a href={`/registrar/pack?season=${season.id}`}>Submission pack</a>
              </li>
              <li>
                <a href={`/registrar/people?season=${season.id}`}>People</a>
              </li>
              <li>
                <a href={`/registrar/club?season=${season.id}`}>Club profile</a>
              </li>
            </ul>
          </section>

          {grouped.needsAction.length > 0 && <BulkReminders seasonId={season.id} />}
        </div>
      </div>
    </div>
  );
}
