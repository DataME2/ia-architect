import type { SupabaseClient } from '@supabase/supabase-js';

import { loadFamilyPlayerProfile } from '../../../data/family-player-record.ts';
import { loadAppearances } from '../../../data/performance.ts';
import { loadMyRegistration, loadMyTeams, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadParticipationResponse } from '../../../data/participation.ts';
import { loadMyCorrection } from '../../../data/player-record-correction.ts';
import { ageAt } from '../../../domain/types.ts';
import { nextFixture, seasonFigures } from '../../../web/me-view.ts';
import { participationBanner } from '../../../web/participation-answer.ts';
import { playerRecordLines } from '../../../web/player-record-view.ts';
import { AvailabilityAnswer } from '../_participation/AvailabilityAnswer.tsx';
import { CorrectionPanel } from '../_player/CorrectionPanel.tsx';
import { Figures, FixtureCard, Panel, RecordLines, RegistrationPill, WorkspaceHead } from './shared.tsx';

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

  // BR148: only once you are eighteen may you propose your own correction —
  // the trigger enforces it too, this only decides whether to offer the form.
  const isAdult = ageAt(link.person.dateOfBirth, today) >= 18;
  // BR62 from thirteen (question 80 (C), scope 78): the player answers their
  // own Saturday; until eighteen their guardian may answer too.
  const answersOwnSaturday = ageAt(link.person.dateOfBirth, today) >= 13;
  const pendingCorrection =
    isAdult && registration !== null ? await loadMyCorrection(client, registration.id) : null;

  // BR155 (and BR149's promise): the confirmed record, never a pending claim.
  const profile = registration === null ? null : await loadFamilyPlayerProfile(client, link.clubId, registration.id);

  const response =
    next === null ? null : await loadParticipationResponse(client, link.clubId, next.id, link.personId);

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
          {next !== null && (
            <Panel title="Are you available?">
              {answersOwnSaturday ? (
                <AvailabilityAnswer clubId={link.clubId} fixtureId={next.id} personId={link.personId} response={response} />
              ) : (
                <p style={{ margin: 0 }}>
                  <span className={participationBanner(response).className}>{participationBanner(response).label}</span>
                  <br />
                  <span className="hint">
                    Your guardian answers this for you until you turn thirteen (BR62, BR63).
                  </span>
                </p>
              )}
            </Panel>
          )}
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
          <Panel title="Your record">
            <RecordLines lines={playerRecordLines(link.person, profile)} />
          </Panel>
          {isAdult && registration !== null && (
            <Panel title="Propose a correction">
              <CorrectionPanel
                clubId={link.clubId}
                registrationId={registration.id}
                pending={pendingCorrection}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
