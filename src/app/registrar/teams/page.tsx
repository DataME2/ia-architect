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
import { todayIn } from '../../../web/today.ts';
import { AddMemberForm, NewTeamForm, RecordClearanceForm } from './TeamForms.tsx';
import { removeMemberAction } from './actions.ts';

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

function TeamCard({
  entry,
  people,
}: {
  readonly entry: TeamWithRoster;
  readonly people: readonly { readonly id: string; readonly label: string }[];
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

  // Two lists, because they answer different questions. A team roster can
  // include a nine-year-old; a Working with Children Check cannot — a child
  // is exempt from needing one (BR84), so offering them would invite a
  // registrar to record something that cannot exist.
  const people = (await loadAssignablePeople(client, tenant.clubId)).map(toOption);
  const adults = (
    await loadAssignablePeople(client, tenant.clubId, { adultsOnly: true, asAt: todayIn() })
  ).map(toOption);

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
        teams.map((entry) => <TeamCard key={entry.team.id} entry={entry} people={people} />)
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Record a Working with Children Check</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Needed before anyone can be added as a coach, manager or team official. The check is
          against the <strong>end of this season</strong> ({season.ends_on}), not against today
          &mdash; a card expiring mid-season is caught now, with months to replace it, rather
          than on the morning it lapses (BR54).
        </p>
        <RecordClearanceForm people={adults} />
      </section>
    </>
  );
}
