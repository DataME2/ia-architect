import type { SupabaseClient } from '@supabase/supabase-js';

import { formatMoney } from '../../../domain/finance/money.ts';
import { loadMyTeams, loadRoster, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadFixtureParticipationResponses } from '../../../data/participation.ts';
import { nextFixture } from '../../../web/me-view.ts';
import { participationBanner } from '../../../web/participation-answer.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
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
  const responses = next === null
    ? new Map<string, { readonly status: 'available' | 'not_available'; readonly reason: string | null }>()
    : await loadFixtureParticipationResponses(client, link.clubId, next.id);

  // BR79: registered with the federation, and still cannot take the field.
  const cannotPlay = players.filter(
    (p) => p.registration !== null && p.registration.outstanding_amount_cents > 0,
  );
  const unregistered = players.filter((p) => p.registration === null || p.registration.status !== 'COMPLETE');

  return (
    <>
      <WorkspaceHead title={mine === null ? 'Your squad' : `${mine.team.name} — selection`}>
        The squad, and who cannot be picked. Decline reasons, when they exist, are visible to you as the
        responsible coach and to nobody else in the squad.
      </WorkspaceHead>
      <div className="cols">
        <div className="stack">
          <Panel title="Squad" meta={`${players.length} PLAYERS`}>
            {players.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                {mine === null ? 'You are not named as a team official this season.' : 'No players on this sheet yet.'}
              </p>
            ) : (
              <ul className="roster">
                {players.map((p) => (
                  <li key={p.person.id}>
                    <span>
                      <span className="who">{displayNameFor(p.person)}</span>
                    </span>
                    {p.registration === null ? (
                      <span className="pill pill-stop">Not registered</span>
                    ) : p.registration.outstanding_amount_cents > 0 ? (
                      <span className="pill pill-stop">{formatMoney(p.registration.outstanding_amount_cents)} owing</span>
                    ) : p.registration.status === 'COMPLETE' ? (
                      <span className="pill pill-ok">Registered</span>
                    ) : (
                      <span className="pill pill-warn">Awaiting</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {next !== null && (
            <Panel title="Available for Saturday" meta={next.opponent.toUpperCase()}>
              {players.length === 0 ? (
                <p className="empty" style={{ margin: 0 }}>
                  No players on this sheet yet.
                </p>
              ) : (
                <ul className="roster">
                  {players.map((p) => {
                    const banner = participationBanner(responses.get(p.person.id) ?? null);
                    return (
                      <li key={p.person.id}>
                        <span>
                          <span className="who">{displayNameFor(p.person)}</span>
                        </span>
                        <span className={banner.className}>{banner.label}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}
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
                      {displayNameFor(p.person)} — {formatMoney(p.registration!.outstanding_amount_cents)} outstanding.
                    </b>{' '}
                    Registered with the federation, so every other screen calls this one finished. It is not.{' '}
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
    </>
  );
}
