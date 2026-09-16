import { redirect } from 'next/navigation';

import { SEASON_ROLES } from '../../../domain/types.ts';
import {
  loadPeople,
  loadPeopleRoleSummary,
  loadSeasons,
  loadTenantContext,
} from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import {
  clampPage,
  pageCount,
  parsePage,
  parseRoleFilter,
  ROLE_LABEL,
  UNROSTERED,
  type PersonSummary,
} from '../../../web/people-view.ts';
import { todayIn } from '../../../web/today.ts';
import { setRoleAction } from './actions.ts';

export const dynamic = 'force-dynamic';

function RoleToggle({
  summary,
  seasonId,
  role,
}: {
  readonly summary: PersonSummary;
  readonly seasonId: string;
  readonly role: (typeof SEASON_ROLES)[number];
}) {
  const held = summary.roles.includes(role);

  return (
    <form action={setRoleAction} style={{ display: 'inline' }}>
      <input type="hidden" name="personId" value={summary.personId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="granted" value={held ? '0' : '1'} />
      <button
        type="submit"
        className={held ? undefined : 'secondary'}
        style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
        aria-pressed={held}
        aria-label={`${held ? 'Revoke' : 'Grant'} ${ROLE_LABEL[role]} for ${summary.displayName}`}
      >
        {ROLE_LABEL[role]}
      </button>
    </form>
  );
}

function PersonRow({
  summary,
  seasonId,
}: {
  readonly summary: PersonSummary;
  readonly seasonId: string;
}) {
  return (
    <tr>
      <td>
        <p className="name" style={{ margin: 0 }}>
          {summary.displayName}
          {!summary.legalNameVerified && (
            <>
              {' '}
              <span className="pill pill-stop" title="BR55">
                Name unverified
              </span>
            </>
          )}
        </p>
        <p className="legal-name" style={{ margin: 0 }}>
          {summary.legalName}
          {summary.email !== null && <> &middot; {summary.email}</>}
        </p>
        {summary.guardianNames.length > 0 && (
          <p className="hint" style={{ margin: 0 }}>
            Guardian: {summary.guardianNames.join(', ')}
          </p>
        )}
        {summary.dependantNames.length > 0 && (
          <p className="hint" style={{ margin: 0 }}>
            Responsible for: {summary.dependantNames.join(', ')}
          </p>
        )}
      </td>
      <td>{summary.age === null ? <span className="hint">Not recorded</span> : summary.age}</td>
      <td>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {SEASON_ROLES.map((role) => (
            <RoleToggle key={role} summary={summary} seasonId={seasonId} role={role} />
          ))}
        </div>
      </td>
    </tr>
  );
}

export default async function PeoplePage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly season?: string;
    readonly q?: string;
    readonly role?: string;
    readonly page?: string;
  }>;
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
          show.
        </p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>{tenant.clubName}</h2>
        <p className="lede">No seasons are configured yet. A role is held for one season.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;
  const query = params.q ?? '';
  const roleFilter = parseRoleFilter(params.role);
  const requestedPage = parsePage(params.page);

  const summary = await loadPeopleRoleSummary(client, tenant.clubId, season.id);

  let page = requestedPage;
  let { people: shown, totalCount } = await loadPeople(
    client,
    tenant.clubId,
    season.id,
    todayIn(),
    { query, role: roleFilter, page },
  );

  // A stale link or a hand-edited `?page=` can ask for a page a filter no
  // longer has. Re-fetch the clamped page rather than showing nothing.
  const clamped = clampPage(page, totalCount);
  if (clamped !== page) {
    page = clamped;
    ({ people: shown, totalCount } = await loadPeople(
      client,
      tenant.clubId,
      season.id,
      todayIn(),
      { query, role: roleFilter, page },
    ));
  }

  const pages = pageCount(totalCount);

  return (
    <>

      <h2>People — {season.name}</h2>
      <p className="lede">
        Every Person this club holds, and the roles they hold this season. One row per human:
        a parent who also coaches is one record with two roles, never two records — which is
        Principle P1, and the reason a player&rsquo;s history follows them when they change
        role rather than starting again.
      </p>

      <form method="get" className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 12rem' }}>
          <label htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={query} placeholder="Name or email" />
        </div>
        <div style={{ flex: '1 1 10rem' }}>
          <label htmlFor="role">Role</label>
          <select id="role" name="role" defaultValue={roleFilter ?? ''}>
            <option value="">Every role</option>
            {SEASON_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
            <option value={UNROSTERED}>No role this season</option>
          </select>
        </div>
        {seasons.length > 1 && (
          <div style={{ flex: '1 1 12rem' }}>
            <label htmlFor="season">Season</label>
            <select id="season" name="season" defaultValue={season.id}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="secondary">
          Show
        </button>
      </form>

      <p className="hint" style={{ marginTop: 0 }}>
        Searching matches the legal name as well as the displayed one. When a federation
        rejects a registration it quotes the legal name (BR55), which may be the one name not
        on this screen.
      </p>

      <div className="summary-grid">
        <div className="stat">
          <span className="n">{summary.total}</span>
          <span className="label">people</span>
        </div>
        {SEASON_ROLES.map((role) => (
          <div className="stat" key={role}>
            <span className="n">{summary.byRole.get(role) ?? 0}</span>
            <span className="label">{ROLE_LABEL[role].toLowerCase()}s</span>
          </div>
        ))}
      </div>

      {summary.unrostered > 0 && (
        <p className="notice">
          {summary.unrostered === 1
            ? '1 person holds no role this season'
            : `${summary.unrostered} people hold no role this season`}
          . That is either someone who has not come back, or a record created by mistake —
          both worth knowing, and neither visible from a list of registrations.
        </p>
      )}

      {shown.length === 0 ? (
        <p className="empty">
          {query === '' && roleFilter === null
            ? 'Nobody yet.'
            : `Nobody matches ${query === '' ? 'that filter' : `“${query}”`}.`}
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Age</th>
                <th>Roles this season</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((person) => (
                <PersonRow key={person.personId} summary={person} seasonId={season.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          className="pagination"
          aria-label="People pages"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          {page > 1 && (
            <a
              href={pageHref({ season: season.id, q: query, role: roleFilter, page: page - 1 })}
              className="secondary"
            >
              Previous
            </a>
          )}
          <span className="hint">
            Page {page} of {pages} &middot; {totalCount}{' '}
            {totalCount === 1 ? 'person' : 'people'} match
          </span>
          {page < pages && (
            <a
              href={pageHref({ season: season.id, q: query, role: roleFilter, page: page + 1 })}
              className="secondary"
            >
              Next
            </a>
          )}
        </nav>
      )}

      <p className="hint">
        A highlighted role is held; press it to revoke, or press a faded one to grant. Every
        change is written to the audit log. Roles are season-scoped, so last season&rsquo;s
        list is left exactly as it was.
      </p>
    </>
  );
}

function pageHref(params: {
  readonly season: string;
  readonly q: string;
  readonly role: string | null;
  readonly page: number;
}): string {
  const search = new URLSearchParams();
  search.set('season', params.season);
  if (params.q !== '') search.set('q', params.q);
  if (params.role !== null) search.set('role', params.role);
  if (params.page > 1) search.set('page', String(params.page));
  const qs = search.toString();
  return qs === '' ? '/registrar/people' : `/registrar/people?${qs}`;
}
