import type { SupabaseClient } from '@supabase/supabase-js';

import { loadAppearances } from '../../../data/performance.ts';
import { loadMyRegistration, loadMyTeams, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { nextFixture, seasonFigures } from '../../../web/me-view.ts';
import { ComingSoon, Figures, FixtureCard, Panel, RegistrationPill, WorkspaceHead } from './shared.tsx';

/**
 * A player's own Saturday. What is here is theirs only (BR65) — no other
 * player's status appears in this context.
 */
export async function PlayerWorkspace({
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
  const mine = teams.find((t) => t.role === 'player') ?? null;
  const fixtures =
    season === null || mine === null ? [] : await loadTeamFixtures(client, link.clubId, season.id, mine.team.id);
  const next = nextFixture(fixtures, today);
  const registration = season === null ? null : await loadMyRegistration(client, link.clubId, season.id, link.personId);
  const appearances = registration === null ? [] : await loadAppearances(client, registration.id);

  return (
    <>
      <WorkspaceHead title="Your Saturday">
        What you can see here is <b>yours only</b> — your fixture, your registration, your season.
        No other player&rsquo;s status appears in this context.
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Next fixture" meta={mine === null ? undefined : mine.team.name.toUpperCase()}>
            {next !== null && mine !== null ? (
              <FixtureCard fixture={next} teamName={mine.team.name} />
            ) : (
              <p className="empty" style={{ margin: 0 }}>
                {mine === null ? 'You are not on a team sheet this season yet.' : 'No upcoming fixture entered.'}
              </p>
            )}
          </Panel>
          <ComingSoon title="Are you available?" waitsOn="BR62 — a participation response has no table yet">
            You will answer <b>available</b> or <b>not available</b> here. A decline needs a brief reason,
            and only your coach sees it — never your teammates.
          </ComingSoon>
        </div>
        <div className="stack">
          <Panel title="Your status" meta={season?.name.toUpperCase()}>
            {registration === null ? (
              <p className="empty" style={{ margin: 0 }}>
                No registration for this season.
              </p>
            ) : (
              <RegistrationPill status={registration.status} outstandingCents={registration.outstanding_amount_cents} />
            )}
          </Panel>
          <Panel title="This season">
            <Figures figures={seasonFigures(appearances)} />
          </Panel>
        </div>
      </div>
    </>
  );
}
