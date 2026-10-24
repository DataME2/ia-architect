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
  const mine = teams.find((t) => t.role !== 'player') ?? null;
  const roster = season === null || mine === null ? [] : await loadRoster(client, link.clubId, season.id, mine.team.id);
  const players = roster.filter((r) => r.role === 'player');
  const fixtures =
    season === null || mine === null ? [] : await loadTeamFixtures(client, link.clubId, season.id, mine.team.id);
  const next = nextFixture(fixtures, today);
  const dugout =
    season === null || mine === null
      ? null
      : await loadDugout(client, link.clubId, season.id, mine.team.id, next?.id ?? null, today);
  // Scope 99: the team's own year, from the club's calendar.
  const calendar = mine === null ? null : await loadClubCalendar(client, link.clubId);

  // BR79: registered with the federation, and still cannot take the field.
  // The coach is told that money is owed, never how much (BR78, #73).
  // An approved hardship (BR164) clears the verdict; the coach is not told why.
  const cannotPlay = players.filter(
    (p) => p.registration !== null && p.registration.owes && p.registration.hardship_until === null,
  );
  const unregistered = players.filter((p) => p.registration === null || p.registration.status !== 'COMPLETE');

  // Scope 112: this week's training nights, each player's answer (BR62)
  // and the staff's marks; and the games whose minutes to record.
  const week = weekOf(today);
  const nights = mine === null ? [] : await loadNights(client, link.clubId, [mine.team.id], week.from, week.to);
  const [nightAnswers, nightMarks] = await Promise.all([
    loadNightAnswers(client, link.clubId, nights.map((n) => n.id)),
    loadNightMarks(client, link.clubId, nights.map((n) => n.id)),
  ]);
  const played = fixtures.filter((f) => f.playedOn <= today).slice(-3);
  const gameDays = next === null || played.some((f) => f.id === next.id) ? played : [...played, next];

  return (
    <>
      <WorkspaceHead title={mine === null ? 'Your squad' : `${mine.team.name} — selection`}>
        The squad, and who cannot be picked. Decline reasons, when they exist, are visible to you as the
        responsible coach and to nobody else in the squad.
      </WorkspaceHead>
      <Metrics
        items={[
          { label: 'Players', value: players.length, note: mine?.team.name },
          { label: 'Cannot be selected', value: cannotPlay.length + unregistered.length },
          { label: 'Fixtures', value: fixtures.length, note: link.season?.name },
          { label: 'Next fixture', value: next === null ? 'None' : shortDate(next.playedOn) },
        ]}
      />
      {dugout !== null && mine !== null ? (
        <TeamDugout
          teamName={mine.team.name}
          players={dugout.players}
          officials={dugout.officials}
          fixtureLabel={fixtureLabel(next)}
        />
      ) : (
        <p className="empty">
          {mine === null ? 'You are not named as a team official this season.' : 'No players on this sheet yet.'}
        </p>
      )}
      <div className="cols">
        <div className="stack">
          <Panel title="Training this week" meta={`${shortDate(week.from)} – ${shortDate(week.to)}`.toUpperCase()}>
            {nights.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No training night entered this week. A Technical Lead adds them.
              </p>
            ) : (
              nights.map((n) => (
                <details key={n.id} className="td-team" open={!n.cancelled && n.heldOn <= today}>
                  <summary>
                    {nightLabel(n)}
                    {n.cancelled && <span className="pill">Cancelled</span>}
                  </summary>
                  {!n.cancelled && (
                    <AttendanceSheet
                      clubId={link.clubId}
                      sessionId={n.id}
                      held={n.heldOn <= today}
                      rows={players.map((p) => {
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
              ))
            )}
          </Panel>
          <Panel title="Game time" meta="MINUTES AND POSITIONS">
            {gameDays.length === 0 || mine === null ? (
              <p className="empty" style={{ margin: 0 }}>
                No fixture entered for this team yet.
              </p>
            ) : (
              <ul className="roster">
                {gameDays.map((f) => (
                  <li key={f.id}>
                    <span className="who">
                      {shortDate(f.playedOn)} v {f.opponent}
                    </span>
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
          <Panel title="Cannot be selected" meta={`${cannotPlay.length + unregistered.length}`}>
            {cannotPlay.length === 0 && unregistered.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                Everyone on the sheet may take the field.
              </p>
            ) : (
              <>
                {cannotPlay.map((p) => (
                  <p className="callout" key={p.person.id}>
                    <b>
                      {displayNameFor(p.person)} — not clear to play.
                    </b>{' '}
                    Money is owed. The amount is for the treasurer and registrar, not the coach.{' '}
                    <span className="mono" style={{ fontSize: '0.7rem' }}>BR79</span>
                  </p>
                ))}
                {unregistered
                  .filter((p) => !cannotPlay.includes(p))
                  .map((p) => (
                    <p className="callout wait" key={p.person.id}>
                      <b>{displayNameFor(p.person)}</b> — registration not complete this season.
                    </p>
                  ))}
              </>
            )}
          </Panel>
          <ComingSoon title="Team chat" waitsOn="the club's safeguarding policy (question #111)">
            A chat for the team, with guardians included for players under 18. Until the club decides how adults
            message children, team notices are planned instead.
          </ComingSoon>
          <Panel title="Next fixture" dark>
            {next !== null && mine !== null ? (
              <FixtureCard fixture={next} teamName={mine.team.name} />
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                No upcoming fixture entered.
              </p>
            )}
          </Panel>
        </div>
      </div>
      {calendar !== null && mine !== null && (
        <CompetitionCalendar
          clubName={link.clubName}
          fixtures={calendar.fixtures.filter((f) => f.teamId === mine.team.id)}
          teams={calendar.teams.filter((t) => t.id === mine.team.id)}
          today={today}
          fixedTeamId={mine.team.id}
        />
      )}
    </>
  );
}
