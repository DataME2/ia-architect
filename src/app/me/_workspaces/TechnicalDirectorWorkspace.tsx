import type { SupabaseClient } from '@supabase/supabase-js';

import { loadDugout } from '../../../data/dugout.ts';
import { loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadPlayerActivity, registrationsByPerson } from '../../../data/technical-director.ts';
import { collectCorrections } from '../../../data/waiting.ts';
import { fixtureLabel } from '../../../web/dugout.ts';
import { nextFixture } from '../../../web/me-view.ts';
import { TD_NOT_PERMITTED, TD_PERMISSIONS, activityByDay, activityLine } from '../../../web/technical-director.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { Panel, WorkspaceHead } from './shared.tsx';

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

  return (
    <>
      <WorkspaceHead title="Technical Director">
        Every squad at {link.clubName}, the corrections waiting on you, and every change to a player in the last
        30 days. Money is not part of this role: a player reads &ldquo;not clear to play&rdquo;, never an amount.
      </WorkspaceHead>

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
