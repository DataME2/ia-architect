import type { SupabaseClient } from '@supabase/supabase-js';

import { loadNightAnswers, loadNightMarks, loadNights } from '../../../data/academy.ts';
import { loadClubCalendar } from '../../../data/competition-calendar.ts';
import { loadDugout } from '../../../data/dugout.ts';
import { loadMyTeams, loadRoster, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { nightLabel, weekOf } from '../../../web/academy.ts';
import { fixtureLabel } from '../../../web/dugout.ts';
import { nextFixture, shortDate } from '../../../web/me-view.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { CollapseAll } from '../../_components/CollapseAll.tsx';
import { CompetitionCalendar } from '../../_components/CompetitionCalendar.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { AttendanceSheet } from '../_academy/AttendanceSheet.tsx';
import { ComingSoon, FixtureCard, Metrics, Panel, WorkspaceHead } from './shared.tsx';

/** The squad, and who cannot be picked. */
export async function CoachWorkspace({
  client,
  link,
  today,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
}) {
  const season = link.season;
  const teams = season === null ? [] : await loadMyTeams(client, link.clubId, season.id, link.personId);
  // Every team the person staffs, each with its own sheet: a coach can run
  // two teams, and the second one must not disappear behind the first.
  const squads =
    season === null
      ? []
      : await Promise.all(
          teams
            .filter((t) => t.role !== 'player')
            .map(async ({ team }) => {
              const [roster, fixtures] = await Promise.all([
                loadRoster(client, link.clubId, season.id, team.id),
                loadTeamFixtures(client, link.clubId, season.id, team.id),
              ]);
              const next = nextFixture(fixtures, today);
              const dugout = await loadDugout(client, link.clubId, season.id, team.id, next?.id ?? null, today);
              return { team, players: roster.filter((r) => r.role === 'player'), fixtures, next, dugout };
            }),
        );
  const several = squads.length > 1;
  const teamIds = squads.map((s) => s.team.id);
  const players = squads.flatMap((s) => s.players);
  const fixtures = squads.flatMap((s) => s.fixtures);
  const next = nextFixture(fixtures, today);
  // Scope 99: the teams' own year, from the club's calendar.
  const calendar = squads.length === 0 ? null : await loadClubCalendar(client, link.clubId);

  // BR79: registered with the federation, and still cannot take the field.
  // The coach is told that money is owed, never how much (BR78, #73).
  // An approved hardship (BR164) clears the verdict; the coach is not told why.
  const blocked = squads.flatMap((s) =>
    s.players.flatMap((p) => {
      const owes = p.registration !== null && p.registration.owes && p.registration.hardship_until === null;
      const incomplete = p.registration === null || p.registration.status !== 'COMPLETE';
      return owes || incomplete ? [{ team: s.team, player: p, owes }] : [];
    }),
  );

  // Scope 112: this week's training nights, each player's answer (BR62)
  // and the staff's marks; and the games whose minutes to record.
  const week = weekOf(today);
  const nights = squads.length === 0 ? [] : await loadNights(client, link.clubId, teamIds, week.from, week.to);
  const [nightAnswers, nightMarks] = await Promise.all([
    loadNightAnswers(client, link.clubId, nights.map((n) => n.id)),
    loadNightMarks(client, link.clubId, nights.map((n) => n.id)),
  ]);
  const gameDays = squads.flatMap((s) => {
    const played = s.fixtures.filter((f) => f.playedOn <= today).slice(-3);
    const days = s.next === null || played.some((f) => f.id === s.next?.id) ? played : [...played, s.next];
    return days.map((f) => ({ team: s.team, fixture: f }));
  });
  const named = (teamName: string, label: string) => (several ? `${teamName} · ${label}` : label);

  return (
    <>
      <WorkspaceHead title={squads.length === 1 ? `${squads[0]?.team.name} — selection` : 'Your squads — selection'}>
        {several ? `${squads.map((s) => s.team.name).join(' and ')}: each` : 'The'} squad, and who cannot be picked.
        Decline reasons, when they exist, are visible to you as the responsible coach and to nobody else in the
        squad.
      </WorkspaceHead>
      <Metrics
        items={[
          { label: 'Players', value: players.length, note: several ? `${squads.length} teams` : squads[0]?.team.name },
          { label: 'Cannot be selected', value: blocked.length },
          { label: 'Fixtures', value: fixtures.length, note: link.season?.name },
          { label: 'Next fixture', value: next === null ? 'None' : shortDate(next.playedOn) },
        ]}
      />
      {squads.length === 0 ? (
        <p className="empty">You are not named as a team official this season.</p>
      ) : several ? (
        <section id="coach-squads" aria-label="Your squads">
          <CollapseAll target="coach-squads" label="Every team's dugout" />
          {squads.map((s) => (
          <details key={s.team.id} className="td-team" open>
            <summary>
              {s.team.name}
              <span className="hint">
                {' '}
                &middot; {s.players.length} {s.players.length === 1 ? 'player' : 'players'}
              </span>
            </summary>
            <TeamDugout
              teamName={s.team.name}
              players={s.dugout.players}
              officials={s.dugout.officials}
              fixtureLabel={fixtureLabel(s.next)}
            />
          </details>
          ))}
        </section>
      ) : (
        squads.map((s) => (
          <TeamDugout
            key={s.team.id}
            teamName={s.team.name}
            players={s.dugout.players}
            officials={s.dugout.officials}
            fixtureLabel={fixtureLabel(s.next)}
          />
        ))
      )}
      <div className="cols">
        <div className="stack">
          <Panel title="Training this week" meta={`${shortDate(week.from)} – ${shortDate(week.to)}`.toUpperCase()}>
            {nights.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No training night entered this week. A Technical Lead adds them.
              </p>
            ) : (
              nights.map((n) => {
                const squad = squads.find((s) => s.team.id === n.teamId);
                if (squad === undefined) return null;
                return (
                <details key={n.id} className="td-team" open={!n.cancelled && n.heldOn <= today}>
                  <summary>
                    {named(squad.team.name, nightLabel(n))}
                    {n.cancelled && <span className="pill">Cancelled</span>}
                  </summary>
                  {!n.cancelled && (
                    <AttendanceSheet
                      clubId={link.clubId}
                      sessionId={n.id}
                      held={n.heldOn <= today}
                      rows={squad.players.map((p) => {
                        const a = nightAnswers.find((x) => x.sessionId === n.id && x.personId === p.person.id);
                        const m = nightMarks.find((x) => x.sessionId === n.id && x.personId === p.person.id);
                        return {
                          personId: p.person.id,
                          name: displayNameFor(p.person),
                          answer: a === undefined ? null : { available: a.available, reason: a.reason },
                          mark: m === undefined ? null : { mark: m.mark, reason: m.reason },
                        };
                      })}
                    />
                  )}
                </details>
                );
              })
            )}
          </Panel>
          <Panel title="Game time" meta="MINUTES AND POSITIONS">
            {gameDays.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No fixture entered for {several ? 'these teams' : 'this team'} yet.
              </p>
            ) : (
              <ul className="roster">
                {gameDays.map(({ team, fixture: f }) => (
                  <li key={f.id}>
                    <span className="who">{named(team.name, `${shortDate(f.playedOn)} v ${f.opponent}`)}</span>
                    <a className="button secondary" href={`/me/game-time/${f.id}?${new URLSearchParams({ club: link.clubId })}`}>
                      {f.playedOn < today ? 'Enter game time' : 'Track live'}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <AssistantNote kind="explaining">
            A decline&rsquo;s reason is visible to you as the responsible coach and to nobody else in the
            squad (BR62).
          </AssistantNote>
        </div>
        <div className="stack">
          <Panel title="Cannot be selected" meta={`${blocked.length}`}>
            {blocked.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                Everyone on {several ? 'your sheets' : 'the sheet'} may take the field.
              </p>
            ) : (
              blocked.map(({ team, player: p, owes }) =>
                owes ? (
                  <p className="callout" key={`${team.id}-${p.person.id}`}>
                    <b>{named(team.name, `${displayNameFor(p.person)} — not clear to play.`)}</b> Money is owed. The
                    amount is for the treasurer and registrar, not the coach.{' '}
                    <span className="mono" style={{ fontSize: '0.7rem' }}>BR79</span>
                  </p>
                ) : (
                  <p className="callout wait" key={`${team.id}-${p.person.id}`}>
                    <b>{named(team.name, displayNameFor(p.person))}</b> — registration not complete this season.
                  </p>
                ),
              )
            )}
          </Panel>
          <ComingSoon title="Team chat" waitsOn="the club's safeguarding policy (question #111)">
            A chat for the team, with guardians included for players under 18. Until the club decides how adults
            message children, team notices are planned instead.
          </ComingSoon>
          <Panel title={several ? 'Next fixtures' : 'Next fixture'} dark>
            {squads.some((s) => s.next !== null) ? (
              squads.map((s) => s.next !== null && <FixtureCard key={s.team.id} fixture={s.next} teamName={s.team.name} />)
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                No upcoming fixture entered.
              </p>
            )}
          </Panel>
        </div>
      </div>
      {calendar !== null && (
        <CompetitionCalendar
          clubName={link.clubName}
          fixtures={calendar.fixtures.filter((f) => f.teamId !== null && teamIds.includes(f.teamId))}
          teams={calendar.teams.filter((t) => teamIds.includes(t.id))}
          today={today}
          fixedTeamId={several ? null : (teamIds[0] ?? null)}
        />
      )}
    </>
  );
}
