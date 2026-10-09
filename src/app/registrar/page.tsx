import { redirect } from 'next/navigation';

import { loadQueue, loadSeasons, loadTenantContext } from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { totalOwed } from '../../domain/finance/eligibility.ts';
import { formatMoney } from '../../domain/finance/money.ts';
import {
  QUEUE_VIEWS,
  blockerSummary,
  blockingCheck,
  eligibilityOf,
  groupQueue,
  owing,
  parseQueueView,
  searchQueue,
  unpaidButRegistered,
  type QueueEntry,
} from '../../web/queue-view.ts';
import { STATUS_LABEL } from '../../web/household-view.ts';
import { Marker, QueueTable } from '../../components/ui/QueueTable.tsx';
import { todayIn } from '../../web/today.ts';
import { BulkReminders } from './_components/BulkReminders.tsx';

export const dynamic = 'force-dynamic';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** The registration state, as a dot and a word. */
function StateMarker({ entry }: { readonly entry: QueueEntry }) {
  const tone = entry.status === 'COMPLETE' ? 'ok' : entry.status === 'DRAFT' ? 'neutral' : 'pending';
  return <Marker tone={tone}>{STATUS_LABEL[entry.status]}</Marker>;
}

/** Whether a coach may select them (BR79, BR43), as a dot and a word. */
function EligibilityMarker({ entry }: { readonly entry: QueueEntry }) {
  const e = eligibilityOf(entry);
  return <Marker tone={e.mayPlay ? 'ok' : 'stop'}>{e.mayPlay ? 'Can be selected' : 'Cannot be selected'}</Marker>;
}

function PlayerCell({ entry, seasonId }: { readonly entry: QueueEntry; readonly seasonId: string }) {
  return (
    <a className="text-foreground" href={`/registrar/${entry.registrationId}?season=${seasonId}`}>
      {entry.displayName}
    </a>
  );
}

function ActionLink({ href, children }: { readonly href: string; readonly children: string }) {
  return (
    <a className="text-foreground" href={href}>
      {children}
    </a>
  );
}

export default async function RegistrarPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string; readonly q?: string; readonly view?: string }>;
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
  const view = parseQueueView(params.view);
  const query = (params.q ?? '').trim();
  const all = await loadQueue(client, tenant.clubId, season.id, todayIn());
  const entries = searchQueue(all, query);
  const grouped = groupQueue(entries);
  const summary = blockerSummary(entries);
  const unpaid = unpaidButRegistered(entries);
  const debtors = owing(entries);
  const [y, m, d] = todayIn().split('-');
  const viewHref = (key: string, withQuery = true) => {
    const q = new URLSearchParams({ season: season.id, view: key });
    if (withQuery && query !== '') q.set('q', query);
    return `/registrar?${q.toString()}`;
  };
  const show = (key: 'blockers' | 'external' | 'eligibility') => view === 'all' || view === key;
  const open = (e: QueueEntry) => `/registrar/${e.registrationId}?season=${season.id}`;

  return (
    <div className="flex flex-col gap-ds-5">
      <header className="flex flex-col gap-ds-2">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Registrar / {season.name} / {Number(d)} {MONTHS[Number(m) - 1]} {y}
        </p>
        <div className="flex flex-wrap items-center gap-ds-5">
          <h2 className="m-0 flex-1 text-[28px] lg:text-[36px] font-bold leading-tight text-foreground">
            Keep the season moving.
          </h2>
          {grouped.needsAction.length > 0 && (
            <a className="button" href="#bulk-reminders">
              Review bulk reminders
            </a>
          )}
        </div>
        <p className="m-0 text-[15px] text-muted-foreground">
          {tenant.clubName}. What blocks a registration is shown apart from what stops a player taking the field.
          Rules are evaluated fresh on each load.
        </p>
      </header>

      {/* A GET form: the search, season and tab are a URL, so a filtered queue can be shared and reloaded. */}
      <form method="get" className="grid gap-ds-5 grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
        <input type="hidden" name="view" value={view} />
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="q">Search registrations</label>
          <input id="q" name="q" type="search" defaultValue={query} placeholder="Preferred or legal name" />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="season">Season scope</label>
          <select id="season" name="season" defaultValue={season.id}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {tenant.clubName}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="secondary">
          Show
        </button>
      </form>

      <nav aria-label="Queue sections" className="flex flex-wrap gap-ds-2">
        {QUEUE_VIEWS.map((v) => (
          <a
            key={v.key}
            href={viewHref(v.key)}
            aria-current={view === v.key ? 'page' : undefined}
            className={
              view === v.key
                ? 'button'
                : 'inline-flex items-center min-h-[44px] px-ds-3 text-[13px] font-semibold text-foreground no-underline hover:underline'
            }
          >
            {v.label}
          </a>
        ))}
      </nav>

      {query !== '' && (
        <p className="m-0 text-sm text-muted-foreground">
          {entries.length} of {all.length} registrations match &ldquo;{query}&rdquo;.{' '}
          <a href={viewHref(view, false)}>Clear the search</a>
        </p>
      )}

      {show('blockers') && (
        <QueueTable
          title="Document and identity blockers"
          subtitle="Registrations a rule or a possible duplicate is holding up. Requirements are frozen when each registration was created."
          columns={['Player', 'Registration state', 'Play eligibility', 'Blocking check', 'Next action']}
          rows={grouped.needsAction.map((e) => ({
            key: e.registrationId,
            cells: [
              <PlayerCell key="p" entry={e} seasonId={season.id} />,
              <StateMarker key="s" entry={e} />,
              <EligibilityMarker key="e" entry={e} />,
              blockingCheck(e),
              <ActionLink key="a" href={open(e)}>
                Open checklist
              </ActionLink>,
            ],
          }))}
          empty="Nothing is blocked."
        />
      )}

      {view === 'blockers' && summary.length > 0 && (
        <QueueTable
          title="What is holding the season up"
          subtitle="Counted per rule (open question 32): which part of the delay is which."
          columns={['Rule', 'Registrations', 'Example']}
          rows={summary.map((r) => ({ key: r.ruleId, cells: [r.ruleId, String(r.count), r.example] }))}
          empty="No rule is failing."
        />
      )}

      {show('external') && (
        <QueueTable
          title="External registration outcomes"
          subtitle="A complete club registration is not governing-body registration (BR43)."
          columns={['Player', 'Registration state', 'Play eligibility', 'External outcome', 'Next action']}
          rows={[...grouped.readyToSubmit, ...grouped.awaitingFederation].map((e) => ({
            key: e.registrationId,
            cells: [
              <PlayerCell key="p" entry={e} seasonId={season.id} />,
              <StateMarker key="s" entry={e} />,
              <EligibilityMarker key="e" entry={e} />,
              e.status === 'PENDING_EXTERNAL_REGISTRATION' ? 'Sent · awaiting response' : 'Ready for the next pack',
              e.status === 'PENDING_EXTERNAL_REGISTRATION' ? (
                <ActionLink key="a" href={open(e)}>
                  Record external outcome
                </ActionLink>
              ) : (
                <ActionLink key="a" href="/registrar/pack">
                  Build a pack
                </ActionLink>
              ),
            ],
          }))}
          empty="Nothing is waiting on the governing body."
        />
      )}

      {show('eligibility') && unpaid.length > 0 && (
        <QueueTable
          title="Registered, but cannot play"
          subtitle={`No pay, no play (BR79): ${formatMoney(totalOwed(unpaid))} owed. Confirmed by the governing body, so every other screen reports them as finished.`}
          columns={['Player', 'Registration state', 'Play eligibility', 'Outstanding', 'Next action']}
          rows={unpaid.map((e) => ({
            key: e.registrationId,
            cells: [
              <PlayerCell key="p" entry={e} seasonId={season.id} />,
              <StateMarker key="s" entry={e} />,
              <EligibilityMarker key="e" entry={e} />,
              e.outstandingCents === null ? 'Owes (BR78)' : formatMoney(e.outstandingCents),
              <ActionLink key="a" href={`${open(e)}#payment`}>
                Open payment
              </ActionLink>,
            ],
          }))}
          empty="Nobody registered owes money."
        />
      )}

      {show('eligibility') && (
        <QueueTable
          title="Ready records"
          subtitle="Registered with the governing body."
          columns={['Player', 'Registration', 'Eligibility', 'Next action']}
          rows={grouped.complete.map((e) => ({
            key: e.registrationId,
            cells: [
              <PlayerCell key="p" entry={e} seasonId={season.id} />,
              <StateMarker key="s" entry={e} />,
              <EligibilityMarker key="e" entry={e} />,
              <ActionLink key="a" href={`/registrar/players/${e.registrationId}`}>
                View record
              </ActionLink>,
            ],
          }))}
          empty="No player has been confirmed by the governing body yet."
          footnote={`Showing ${entries.length} registration${entries.length === 1 ? '' : 's'}${
            debtors.length > 0
              ? `; ${formatMoney(totalOwed(debtors))} owed by ${debtors.length} ${debtors.length === 1 ? 'family' : 'families'}`
              : ''
          }. Counts are distinct registrations, not people or rule failures.`}
        />
      )}

      {grouped.needsAction.length > 0 && (
        <div id="bulk-reminders">
          <BulkReminders seasonId={season.id} />
        </div>
      )}

      <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-muted">
        {tenant.clubName} only · {season.name}
      </p>
    </div>
  );
}
