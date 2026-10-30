import { redirect } from 'next/navigation';

import { loadSeasons, loadTenantContext } from '../../../data/queries.ts';
import { loadAssignablePeople, loadTeams, type TeamWithRoster } from '../../../data/teams.ts';
import { createRequestClient, currentUser } from '../../../data/server.ts';
import { displayNameFor, fullLegalName } from '../../../web/queue-view.ts';
import {
  TEAM_ROLE_LABEL,
  teamSummary,
  unclearedOfficials,
  type RosterEntry,
} from '../../../web/team-view.ts';
import {
  calendarsForSeason,
  changeSentence,
  competitionOptions,
  describeCompetition,
  mayEditCompetitions,
  type CompetitionOptionGroup,
} from '../../../web/team-competitions.ts';
import { stamp } from '../../../web/inbox-view.ts';
import {
  loadCompetitionHistory,
  loadTeamCompetitions,
  type TeamCompetition,
} from '../../../data/team-competitions.ts';
import { AddMemberForm, EnterCompetitionForm, NewTeamForm } from './TeamForms.tsx';
import { removeMemberAction, withdrawCompetitionAction } from './actions.ts';

export const dynamic = 'force-dynamic';

function MemberRow({ entry }: { readonly entry: RosterEntry }) {
  return (
    <tr>
      <td>
        <p className="name" style={{ margin: 0 }}>
          {entry.displayName}
        </p>
        <p className="legal-name" style={{ margin: 0 }}>
          {entry.legalName}
        </p>
      </td>
      <td>{TEAM_ROLE_LABEL[entry.role]}</td>
      <td>
        {entry.role === 'player' ? (
          <span className="hint">&mdash;</span>
        ) : entry.clearance.ok ? (
          <span className="pill pill-ok">
            Cleared{entry.clearance.expiresOn === null ? '' : ` to ${entry.clearance.expiresOn}`}
          </span>
        ) : (
          <span className="pill pill-stop">Not cleared</span>
        )}
      </td>
      <td>
        <form action={removeMemberAction}>
          <input type="hidden" name="memberId" value={entry.memberId} />
          <button
            type="submit"
            className="secondary"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
          >
            Remove
          </button>
        </form>
      </td>
    </tr>
  );
}

/**
 * Where this team plays (BR179): each competition links to its season
 * calendar, following it. Any member reads it; only the four editor roles
 * see the controls — and the database refuses anyone else regardless.
 */
function TeamCompetitions({
  teamId,
  entered,
  groups,
  canEdit,
}: {
  readonly teamId: string;
  readonly entered: readonly TeamCompetition[];
  readonly groups: readonly CompetitionOptionGroup[];
  readonly canEdit: boolean;
}) {
  return (
    <div className="team-competitions">
      <h4>Competitions this season</h4>
      {entered.length === 0 ? (
        <p className="hint">Not entered in a competition yet.</p>
      ) : (
        <ul>
          {entered.map((c) => {
            const d = describeCompetition(c.calendarId, c.competitionRef);
            return (
              <li key={`${c.calendarId}/${c.competitionRef}`}>
                {d.href ? <a href={d.href}>{d.name}</a> : <span>{d.name}</span>}
                <span className="hint"> · {d.region}</span>
                {canEdit && (
                  <form action={withdrawCompetitionAction}>
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="calendarId" value={c.calendarId} />
                    <input type="hidden" name="competitionRef" value={c.competitionRef} />
                    <button type="submit" className="secondary" aria-label={`Withdraw from ${d.name}`}>
                      Withdraw
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit &&
        (groups.length === 0 ? (
          <p className="hint">
            No published season calendar covers this season yet, so there is nothing to choose
            from. See <a href="/seasons">season calendars</a>.
          </p>
        ) : (
          <EnterCompetitionForm teamId={teamId} groups={groups} />
        ))}
    </div>
  );
}

function TeamCard({
  entry,
  people,
  competitions,
  groups,
  canEdit,
}: {
  readonly entry: TeamWithRoster;
  readonly people: readonly { readonly id: string; readonly label: string }[];
  readonly competitions: readonly TeamCompetition[];
  readonly groups: readonly CompetitionOptionGroup[];
  readonly canEdit: boolean;
}) {
  const uncleared = unclearedOfficials(entry.roster);
  const everyone = [...entry.roster.officials, ...entry.roster.players];

  return (
    <section className="card">
      <div className="card-row">
        <h3 style={{ marginTop: 0 }}>
          {entry.team.name}
          {entry.team.ageGroup !== null && (
            <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {entry.team.ageGroup}</span>
          )}
        </h3>
        <span className={uncleared.length > 0 ? 'pill pill-stop' : 'pill pill-ok'}>
          {entry.roster.players.length} player{entry.roster.players.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className="hint" style={{ marginTop: 0 }}>
        {teamSummary(entry.roster)}
      </p>

      {uncleared.length > 0 && (
        <p className="notice">
          <strong>
            {uncleared.length === 1
              ? 'An official on this team is not cleared.'
              : `${uncleared.length} officials on this team are not cleared.`}
          </strong>{' '}
          {uncleared.map((o) => `${o.displayName}: ${o.clearance.ok ? '' : o.clearance.note}`).join(' ')}
        </p>
      )}

      <TeamCompetitions
        teamId={entry.team.id}
        entered={competitions.filter((c) => c.teamId === entry.team.id)}
        groups={groups}
        canEdit={canEdit}
      />

      {everyone.length === 0 ? (
        <p className="empty">Nobody in this team yet.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Clearance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {everyone.map((member) => (
                <MemberRow key={member.memberId} entry={member} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h4>Add to this team</h4>
      <AddMemberForm teamId={entry.team.id} people={people} />
    </section>
  );
}

export default async function TeamsPage({
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
        <p className="lede">This account is not a member of any club.</p>
      </>
    );
  }

  const seasons = await loadSeasons(client, tenant.clubId);
  if (seasons.length === 0) {
    return (
      <>
        <h2>{tenant.clubName}</h2>
        <p className="lede">No seasons are configured yet. A team belongs to one.</p>
      </>
    );
  }

  const params = await searchParams;
  const season = seasons.find((s) => s.id === params.season) ?? seasons[0]!;

  const teams = await loadTeams(client, tenant.clubId, season.id, season.ends_on);
  const toOption = (person: Parameters<typeof displayNameFor>[0] & { id: string }) => ({
    id: person.id,
    label: `${displayNameFor(person)} — ${fullLegalName(person)}`,
  });

  // A team roster can include a nine-year-old. Working with Children Checks,
  // which only adults need (BR84), are recorded on their own screen
  // (/registrar/clearances, scope 125).
  const people = (await loadAssignablePeople(client, tenant.clubId)).map(toOption);

  // BR179: where each team plays, offered from the calendars this season covers.
  const canEdit = mayEditCompetitions(tenant.roles);
  const competitions = await loadTeamCompetitions(client, tenant.clubId, teams.map((t) => t.team.id));
  const groups = competitionOptions(calendarsForSeason(season.starts_on, season.ends_on));
  const history = canEdit ? await loadCompetitionHistory(client, tenant.clubId) : [];

  const totalPlayers = teams.reduce((n, t) => n + t.roster.players.length, 0);
  const totalUncleared = teams.reduce((n, t) => n + unclearedOfficials(t.roster).length, 0);

  return (
    <>

      <h2>Teams — {season.name}</h2>
      <p className="lede">
        Who plays where, and who is responsible for them. A person appears in a team once per
        role, so a parent who coaches the team their child plays in is two rows and one
        record (P1).
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
          <span className="n">{teams.length}</span>
          <span className="label">teams</span>
        </div>
        <div className="stat">
          <span className="n">{totalPlayers}</span>
          <span className="label">players placed</span>
        </div>
        <div className="stat">
          <span className="n">{totalUncleared}</span>
          <span className="label">officials not cleared</span>
        </div>
      </div>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>New team</h3>
        <NewTeamForm seasonId={season.id} />
      </section>

      {teams.length === 0 ? (
        <p className="empty">No teams yet for {season.name}.</p>
      ) : (
        teams.map((entry) => (
          <TeamCard
            key={entry.team.id}
            entry={entry}
            people={people}
            competitions={competitions}
            groups={groups}
            canEdit={canEdit}
          />
        ))
      )}

      {canEdit && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Competition changes</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Every team entered in or withdrawn from a competition, by whom and when (times in
            UTC). Written by the database itself, and never edited or removed (BR179).
          </p>
          {history.length === 0 ? (
            <p className="empty">No changes yet.</p>
          ) : (
            <ol className="team-competition-history">
              {history.map((h, i) => (
                <li key={`${h.changedAt}-${i}`}>
                  <time dateTime={h.changedAt}>{stamp(h.changedAt)}</time>{' '}
                  <span className={h.action === 'entered' ? 'pill pill-ok' : 'pill pill-warn'}>
                    {h.action === 'entered' ? 'Entered' : 'Withdrawn'}
                  </span>{' '}
                  {changeSentence(h)}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <p className="hint">
        A coach, manager or team official needs a verified Working with Children Check before they
        can be added.{' '}
        <a href={`/registrar/clearances?season=${encodeURIComponent(season.id)}`}>Record a check</a>
      </p>
    </>
  );
}
