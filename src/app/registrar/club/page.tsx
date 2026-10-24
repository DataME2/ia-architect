import { redirect } from 'next/navigation';

import { loadClubProfile, loadRegistrationCounts } from '../../../data/club-profile.ts';
import { loadGovernanceOrEmpty } from '../../../data/governance.ts';
import { loadFixtures } from '../../../data/performance.ts';
import { loadPeopleRoleSummary, loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { loadTeams } from '../../../data/teams.ts';
import { formatMoney } from '../../../domain/finance/money.ts';
import { COMMITTEE_POSITIONS, governingTerm, serving } from '../../../domain/governance/term.ts';
import { dayMonthYear, jurisdictionName, standingWord } from '../../../web/club-profile-view.ts';
import { share } from '../../../web/dashboard-view.ts';
import { POSITION_LABEL } from '../../../web/governance-view.ts';
import { initialsOf } from '../../../web/me-view.ts';
import { standing } from '../../../web/platform-view.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { todayIn } from '../../../web/today.ts';

export const dynamic = 'force-dynamic';

/**
 * The club's own page, after the Superdesign organization profile (scope
 * 106): what the club is, what it fields this season, who runs it, and what
 * it has agreed with the platform.
 *
 * Every club has one, and sees only its own: each read is the table's
 * member policy (P5). Read-only on purpose. The draft's edit, upload and
 * upgrade buttons had nothing behind them; the screens that change a team
 * or the committee are linked instead.
 */
export default async function ClubProfilePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly season?: string }>;
}) {
  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) redirect('/sign-in?next=%2Fregistrar%2Fclub');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) redirect('/registrar');

  const today = todayIn();
  const seasons = await loadSeasons(client, tenant.clubId);
  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0] ?? null;

  const [profile, governance, people, teams, fixtures, registrations] = await Promise.all([
    loadClubProfile(client, tenant.clubId, today),
    loadGovernanceOrEmpty(client, tenant.clubId),
    season === null ? null : loadPeopleRoleSummary(client, tenant.clubId, season.id),
    season === null ? [] : loadTeams(client, tenant.clubId, season.id, season.ends_on),
    season === null ? [] : loadFixtures(client, tenant.clubId, season.id),
    season === null ? { total: 0, complete: 0 } : loadRegistrationCounts(client, tenant.clubId, season.id),
  ]);

  const licence = standingWord(standing(profile.licence, today));
  const term = governingTerm(governance.terms, today);
  const committee = term === null
    ? []
    : [...serving(governance.members.filter((m) => m.termId === term.id), today)].sort(
        (a, b) => COMMITTEE_POSITIONS.indexOf(a.position) - COMMITTEE_POSITIONS.indexOf(b.position),
      );
  const players = teams.reduce((n, t) => n + t.roster.players.length, 0);
  const toPlay = fixtures.filter((f) => f.played_on >= today).length;
  const registered = share(registrations.complete, registrations.total);
  const seasonQuery = season === null ? '' : `?season=${season.id}`;

  return (
    <div className="dash">
      <section className="club-head" aria-labelledby="club-name">
        {/* The crest slot the identity rail draws: dashed until a crest is
            licensed, because there is nowhere yet to store one. */}
        <span className="club-crest" aria-hidden="true">
          {initialsOf(tenant.clubName.replace(/\(.*\)/, ''))}
        </span>
        <div className="club-head-main">
          <p className="eyebrow">Club profile</p>
          <h2 id="club-name">{tenant.clubName}</h2>
          <p className="club-head-where">
            {jurisdictionName(profile.jurisdiction)}
            {season !== null && ` · ${season.name}`}
          </p>
          <p className="club-head-chips">
            {people !== null && <span className="pill">{people.total} people on record</span>}
            <span className={licence.tone}>{licence.label}</span>
          </p>
        </div>
        {tenant.roles.includes('admin') && (
          <a className="button secondary" href="/registrar/access">
            Manage access
          </a>
        )}
      </section>

      {seasons.length > 1 && season !== null && (
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

      <div className="dash-metrics is-five">
        <div className="dash-metric">
          <p className="dash-metric-label">People on record</p>
          <p className="dash-metric-n">{people?.total ?? 0}</p>
          <p className="dash-metric-note">{people?.unrostered ?? 0} with no role this season</p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Teams</p>
          <p className="dash-metric-n">{teams.length}</p>
          <p className="dash-metric-note">{players} players on team sheets</p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Fixtures</p>
          <p className="dash-metric-n">{fixtures.length}</p>
          <p className="dash-metric-note">{toPlay} still to play</p>
        </div>
        <div className="dash-metric is-light">
          <p className="dash-metric-label">Registrations</p>
          <p className="dash-metric-n">{registrations.total}</p>
          <p className="dash-metric-note">this season</p>
        </div>
        <div className="dash-metric is-green">
          <p className="dash-metric-label">Registered</p>
          <p className="dash-metric-n">{registered === null ? '—' : `${registered}%`}</p>
          <p className="dash-metric-note">confirmed by the federation</p>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-main">
          <section className="dash-card" aria-labelledby="club-teams">
            <div className="dash-card-head">
              <h3 id="club-teams">Teams this season</h3>
              <a href={`/registrar/teams${seasonQuery}`}>Open teams</a>
            </div>
            {teams.length === 0 ? (
              <p className="hint">No teams in this season yet.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Team</th>
                      <th scope="col">Coach</th>
                      <th scope="col">Players</th>
                      <th scope="col">Officials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map(({ team, roster }) => {
                      const coaches = roster.officials.filter((o) => o.role === 'coach');
                      return (
                        <tr key={team.id}>
                          <td>
                            <b>{team.name}</b>
                            {team.ageGroup !== null && <span className="dash-legal">{team.ageGroup}</span>}
                          </td>
                          <td>{coaches.length === 0 ? <span className="hint">None named</span> : coaches.map((c) => c.displayName).join(', ')}</td>
                          <td className="dash-num">{roster.players.length}</td>
                          <td className="dash-num">{roster.officials.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="dash-card" aria-labelledby="club-committee">
            <div className="dash-card-head">
              <h3 id="club-committee">The committee{term !== null && ` · ${term.name}`}</h3>
              <a href="/registrar/governance">Governance</a>
            </div>
            {committee.length === 0 ? (
              <p className="hint">
                {term === null ? 'No governance year has been opened yet.' : 'Nobody is recorded as serving this term.'}
              </p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Position</th>
                      <th scope="col">Elected</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {committee.map((m) => {
                      const person = governance.people.get(m.personId);
                      return (
                        <tr key={m.id}>
                          <td>{person === undefined ? <span className="hint">Not visible to your role</span> : displayNameFor(person)}</td>
                          <td>{m.roleTitle ?? POSITION_LABEL[m.position]}</td>
                          <td className="dash-num">{m.electedOn === null ? '—' : dayMonthYear(m.electedOn)}</td>
                          <td>
                            {/* BR166: a position counts once it is confirmed. */}
                            {m.confirmedAt !== null ? (
                              <span className="pill pill-ok">Confirmed</span>
                            ) : (
                              <span className="pill pill-warn">Awaiting confirmation</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="dash-side">
          <section className="dash-card is-dark" aria-labelledby="club-licence">
            <h3 id="club-licence">Licence</h3>
            <p>
              <span className={licence.tone}>{licence.label}</span>
            </p>
            {profile.licence !== null && (
              <dl className="dash-facts">
                <div>
                  <dt>Term</dt>
                  <dd>
                    {dayMonthYear(profile.licence.startsOn)} – {dayMonthYear(profile.licence.endsOn)}
                  </dd>
                </div>
                <div>
                  <dt>Agreed fee</dt>
                  <dd>
                    {profile.licence.feeCents === null
                      ? 'No fee agreed'
                      : `${formatMoney(profile.licence.feeCents)} ${profile.licence.currency}`}
                  </dd>
                </div>
              </dl>
            )}
            <p className="dash-card-note">
              The price is agreed with each club, so there is no plan to change here. Ask the platform owner about a
              renewal.
            </p>
          </section>

          <section className="dash-card" aria-labelledby="club-contacts">
            <h3 id="club-contacts">Contacts</h3>
            {profile.contacts.length === 0 ? (
              <p className="hint">No contact is recorded.</p>
            ) : (
              <dl className="dash-facts">
                {profile.contacts.map((c) => (
                  <div key={c.kind}>
                    <dt>{c.kind === 'primary' ? 'Primary contact' : 'Secondary contact'}</dt>
                    <dd>
                      {c.fullName}
                      <br />
                      <a href={`mailto:${c.email}`}>{c.email}</a>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
