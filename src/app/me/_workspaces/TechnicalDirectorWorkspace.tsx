import type { SupabaseClient } from '@supabase/supabase-js';

import { loadNightAnswers, loadNightMarks, loadNights, loadTeamMinutes } from '../../../data/academy.ts';
import { loadDugout } from '../../../data/dugout.ts';
import { loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadPlayerActivity, registrationsByPerson } from '../../../data/technical-director.ts';
import { collectCorrections } from '../../../data/waiting.ts';
import { minutesByPosition, summariseNights, weekOf } from '../../../web/academy.ts';
import { fixtureLabel } from '../../../web/dugout.ts';
import { nextFixture, shortDate } from '../../../web/me-view.ts';
import { TD_NOT_PERMITTED, TD_PERMISSIONS, activityByDay, activityLine } from '../../../web/technical-director.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { GameTimeBars } from '../_academy/GameTimeBars.tsx';
import { TrainingNightForm } from '../_academy/TrainingNightForm.tsx';
import { ComingSoon, Metrics, Panel, WorkspaceHead } from './shared.tsx';

/**
 * The Technical Director's workspace (scope 98, BR176): every squad, the
 * corrections waiting on a confirmer, what changed about any player in the
 * last 30 days, and what the role may and may not do — written down once in
 * `src/web/technical-director.ts`, so a permission is read here before it
 * is ever discovered by being refused.
 */
export async function TechnicalDirectorWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const season = link.season;
  const [teamsResult, corrections, activity] = await Promise.all([
    season === null
      ? Promise.resolve({ data: [] as { id: string; name: string }[] })
      : client.from('team').select('id, name').eq('club_id', link.clubId).eq('season_id', season.id).order('name'),
    collectCorrections(client, link.clubId),
    loadPlayerActivity(client, link.clubId, 30),
  ]);
  const teams = (teamsResult.data ?? []) as { id: string; name: string }[];

  // One dugout per team, each with its own next fixture's answers (BR62).
  const dugouts =
    season === null
      ? []
      : await Promise.all(
          teams.map(async (t) => {
            const fixtures = await loadTeamFixtures(client, link.clubId, season.id, t.id);
            const next = nextFixture(fixtures, today);
            const d = await loadDugout(client, link.clubId, season.id, t.id, next?.id ?? null, today);
            return { team: t, next, ...d };
          }),
        );

  const registrationOf =
    season === null
      ? new Map<string, string>()
      : await registrationsByPerson(client, link.clubId, season.id, activity.map((a) => a.personId));
  const days = activityByDay(activity);

  // Scope 112, the academy: this week's training nights by team, and each
  // team's season minutes by position.
  const week = weekOf(today);
  const nights = await loadNights(client, link.clubId, teams.map((t) => t.id), week.from, week.to);
  const [nightAnswers, nightMarks, teamMinutes] = await Promise.all([
    loadNightAnswers(client, link.clubId, nights.map((n) => n.id)),
    loadNightMarks(client, link.clubId, nights.map((n) => n.id)),
    season === null
      ? Promise.resolve([])
      : Promise.all(dugouts.map(async (d) => minutesByPosition(await loadTeamMinutes(client, link.clubId, season.id, d.team.id)))),
  ]);
  const training = dugouts.map((d) =>
    summariseNights({
      nights: nights.filter((n) => n.teamId === d.team.id),
      playerIds: d.players.map((p) => p.id),
      answers: nightAnswers,
      marks: nightMarks,
      today,
    }),
  );
  const nameOf = new Map(dugouts.flatMap((d) => d.players.map((p) => [p.id, p.name] as const)));

  return (
    <>
      <WorkspaceHead title="Technical Director">
        Every squad at {link.clubName}, the corrections waiting on you, and every change to a player in the last
        30 days. Money is not part of this role: a player reads &ldquo;not clear to play&rdquo;, never an amount.
      </WorkspaceHead>
      <Metrics
        items={[
          { label: 'Teams', value: teams.length, note: season?.name },
          { label: 'Corrections waiting', value: corrections.length },
          { label: 'Player changes', value: activity.length, note: 'last 30 days' },
        ]}
      />

      <h2 className="academy-title" id="academy">
        Academy
      </h2>
      <div className="cols">
        <div className="stack">
          <Panel title="Training this week" meta={`${shortDate(week.from)} – ${shortDate(week.to)}`.toUpperCase()}>
            {dugouts.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No teams this season yet.
              </p>
            ) : (
              <table className="sheet">
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col">Nights</th>
                    <th scope="col">Said yes</th>
                    <th scope="col">Said no</th>
                    <th scope="col">Still to answer</th>
                    <th scope="col">Trained</th>
                    <th scope="col">Late</th>
                    <th scope="col">Did not train</th>
                    <th scope="col">Not marked</th>
                  </tr>
                </thead>
                <tbody>
                  {dugouts.map((d, i) => {
                    const s = training[i];
                    if (s === undefined) return null;
                    return (
                      <tr key={d.team.id}>
                        <th scope="row">{d.team.name}</th>
                        <td>{s.nights}</td>
                        <td>{s.available}</td>
                        <td>{s.notAvailable}</td>
                        <td>{s.noAnswer}</td>
                        <td>{s.trained}</td>
                        <td>{s.late}</td>
                        <td>{s.absent}</td>
                        <td>{s.unmarked}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <p className="hint" style={{ marginBottom: 0 }}>
              Counted per player per night. A night still to come has answers and no marks yet; once it is held, the
              coach&rsquo;s mark counts and nobody is still to answer. A cancelled night counts for nothing. The reasons are on each team&rsquo;s sheet, for the coaches and Technical Leads only (BR62).
            </p>
          </Panel>
          <Panel title="Add a training night">
            <TrainingNightForm clubId={link.clubId} teams={teams} />
          </Panel>
        </div>
        <div className="stack">
          <Panel title="Game time by position" meta={season?.name.toUpperCase()}>
            {dugouts.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No teams this season yet.
              </p>
            ) : (
              dugouts.map((d, i) => (
                <details key={d.team.id} className="td-team" open={i === 0}>
                  <summary>{d.team.name}</summary>
                  <GameTimeBars rows={teamMinutes[i] ?? []} nameOf={(id) => nameOf.get(id) ?? 'A player no longer on the sheet'} />
                </details>
              ))
            )}
          </Panel>
          <ComingSoon title="Team chat" waitsOn="the club's safeguarding policy (question #111)">
            A chat for each team, with guardians included for players under 18. Until the club decides how adults
            message children, team notices are planned instead.
          </ComingSoon>
        </div>
      </div>

      <h2 className="academy-title" id="squads">
        Squads
      </h2>
      {dugouts.length === 0 ? (
        <p className="empty">No teams this season yet.</p>
      ) : (
        dugouts.map((d, i) => (
          <details key={d.team.id} className="td-team" open={i === 0}>
            <summary>
              {d.team.name}
              <span className="hint">
                {' '}
                &middot; {d.players.length} {d.players.length === 1 ? 'player' : 'players'}
              </span>
            </summary>
            <TeamDugout
              teamName={d.team.name}
              players={d.players}
              officials={d.officials}
              fixtureLabel={fixtureLabel(d.next)}
            />
          </details>
        ))
      )}

      <div className="cols">
        <div className="stack">
          <Panel title="Corrections waiting" meta={`${corrections.length}`}>
            {corrections.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No player is waiting on a correction to their record.
              </p>
            ) : (
              <ul className="roster">
                {corrections.map((c) => (
                  <li key={c.subjectKey}>
                    <span>
                      <span className="who">{c.headline}</span>
                      <span className="why">{c.detail}</span>
                    </span>
                    <a className="button secondary" href={c.linkPath}>
                      Review
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Player activity" meta="30 DAYS">
            {days.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                Nothing has changed about a player in the last 30 days.
              </p>
            ) : (
              <div className="td-activity">
                {days.map((d) => (
                  <div key={d.day}>
                    <h4>{d.day}</h4>
                    <ul>
                      {d.rows.map((r, i) => {
                        const reg = registrationOf.get(r.personId);
                        return (
                          <li key={`${r.occurredAt}-${i}`}>
                            <span className="mono hint">{r.occurredAt.slice(11, 16)}</span>{' '}
                            {reg === undefined ? (
                              activityLine(r)
                            ) : (
                              <a href={`/registrar/players/${reg}`}>{activityLine(r)}</a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <AssistantNote kind="explaining">
            The bell carries what is waiting for you to do, such as a correction to confirm. Activity is what to
            know, so it lives here rather than ringing (BR176).
          </AssistantNote>
        </div>

        <div className="stack">
          <Panel title="What you may do as Technical Director">
            <table className="td-permissions">
              <tbody>
                {TD_PERMISSIONS.map((p) => (
                  <tr key={p.area}>
                    <th scope="row">{p.area}</th>
                    <td>
                      {p.may}
                      <span className="mono hint"> {p.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel title="Not part of this role">
            <table className="td-permissions">
              <tbody>
                {TD_NOT_PERMITTED.map((p) => (
                  <tr key={p.area}>
                    <th scope="row">{p.area}</th>
                    <td>
                      {p.may}
                      <span className="mono hint"> {p.source}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint" style={{ marginBottom: 0 }}>
              Written down so it can be checked after testing; a change is made in the policy and in this list
              together.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
