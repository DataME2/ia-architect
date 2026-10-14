import type { SupabaseClient } from '@supabase/supabase-js';

import { loadClubCalendar } from '../../../data/competition-calendar.ts';
import { loadDugout } from '../../../data/dugout.ts';
import { loadMyTeams, loadRoster, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { fixtureLabel } from '../../../web/dugout.ts';
import { nextFixture } from '../../../web/me-view.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { CompetitionCalendar } from '../../_components/CompetitionCalendar.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { FixtureCard, Panel, WorkspaceHead } from './shared.tsx';

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

  return (
    <>
      <WorkspaceHead title={mine === null ? 'Your squad' : `${mine.team.name} — selection`}>
        The squad, and who cannot be picked. Decline reasons, when they exist, are visible to you as the
        responsible coach and to nobody else in the squad.
      </WorkspaceHead>
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
          <Panel title="Next fixture">
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
