import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

import { loadDugout } from '../../../data/dugout.ts';
import { loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import { loadPlayerActivity, registrationsByPerson } from '../../../data/technical-director.ts';
import { collectCorrections } from '../../../data/waiting.ts';
import type { Range } from '../../../web/academy.ts';
import { fixtureLabel } from '../../../web/dugout.ts';
import { nextFixture } from '../../../web/me-view.ts';
import { TD_NOT_PERMITTED, TD_PERMISSIONS, activityByDay, activityLine } from '../../../web/technical-director.ts';
import { weekLabel } from '../../../web/today.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { CollapseAll } from '../../_components/CollapseAll.tsx';
import { TeamDugout } from '../../_components/TeamDugout.tsx';
import { AcademySwitch } from '../_academy/AcademySwitch.tsx';
import { AcademyTab } from '../_academy/AcademyTab.tsx';
import { Panel } from './shared.tsx';

export type TdTab = 'academy' | 'squads' | 'corrections' | 'activity';

const TABS: readonly { readonly key: TdTab; readonly label: string }[] = [
  { key: 'academy', label: 'Academy' },
  { key: 'squads', label: 'Squads' },
  { key: 'corrections', label: 'Corrections' },
  { key: 'activity', label: 'Player activity' },
];

export const tdTabFrom = (value: string | undefined): TdTab =>
  TABS.some((t) => t.key === value) ? (value as TdTab) : 'academy';

/**
 * The Technical Director's workspace (scope 98, BR176; in tabs since scope
 * 113): the Academy, every squad, the corrections waiting on a confirmer
 * beside what the role may and may not do, and what changed about any
 * player in the last 30 days. Each tab is its own address, so it loads only
 * what it shows and can be bookmarked.
 */
export async function TechnicalDirectorWorkspace({
  client,
  link,
  today,
  view,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: string;
  readonly view: { readonly tab: TdTab; readonly team: string | null; readonly range: Range };
}) {
  const hrefFor = (p: { readonly tab?: string; readonly team?: string | null; readonly range?: Range }) => {
    const q = new URLSearchParams({ role: 'technical', club: link.clubId, tab: p.tab ?? view.tab });
    if (p.team) q.set('team', p.team);
    if (p.range !== undefined && p.range !== 'week') q.set('range', p.range);
    return `/me?${q}`;
  };

  return (
    <>
      <header className="td-head">
        <p className="mono hint">
          {link.clubName} · {link.season?.name ?? 'No season'} · {weekLabel(today).replace(/^\d+ · /, '')}
        </p>
        <h1>Technical Director</h1>
        <nav className="td-tabs" aria-label="Technical Director">
          {TABS.map((t) => (
            <a key={t.key} href={hrefFor({ tab: t.key })} aria-current={t.key === view.tab ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {view.tab === 'academy' && (
        <AcademyTab client={client} link={link} today={today} teamId={view.team} range={view.range} hrefFor={hrefFor} />
      )}
      {view.tab === 'squads' && <SquadsTab client={client} link={link} today={today} />}
      {view.tab === 'corrections' && <CorrectionsTab client={client} link={link} />}
      {view.tab === 'activity' && <ActivityTab client={client} link={link} />}
    </>
  );
}

/** Every squad's dugout, each foldable, all at once if need be; and BR184's switch. */
async function SquadsTab({ client, link, today }: { readonly client: SupabaseClient; readonly link: ClubLink; readonly today: string }) {
  const season = link.season;
  const { data } =
    season === null
      ? { data: [] }
      : await client.from('team').select('id, name, academy').eq('club_id', link.clubId).eq('season_id', season.id).order('name');
  const teams = (data ?? []) as { id: string; name: string; academy: boolean }[];
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
  if (dugouts.length === 0) return <p className="empty">No teams this season yet.</p>;
  return (
    <section id="td-squads" aria-label="Squads">
      <CollapseAll target="td-squads" label="Every team's dugout" />
      {dugouts.map((d, i) => (
        <details key={d.team.id} className="td-team" open={i === 0}>
          <summary>
            {d.team.name}
            <span className="hint">
              {' '}
              &middot; {d.players.length} {d.players.length === 1 ? 'player' : 'players'}
              {d.team.academy && ' · academy'}
            </span>
          </summary>
          <AcademySwitch teamId={d.team.id} teamName={d.team.name} academy={d.team.academy} />
          <TeamDugout teamName={d.team.name} players={d.players} officials={d.officials} fixtureLabel={fixtureLabel(d.next)} />
        </details>
      ))}
    </section>
  );
}

/** The corrections waiting on a confirmer, beside what the role may and may not do. */
async function CorrectionsTab({ client, link }: { readonly client: SupabaseClient; readonly link: ClubLink }) {
  const corrections = await collectCorrections(client, link.clubId);
  return (
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
        <AssistantNote kind="explaining">
          The bell carries what is waiting for you to do, such as a correction to confirm. Activity is what to know,
          so it has its own tab rather than ringing (BR176).
        </AssistantNote>
      </div>
      <div className="stack">
        <PermissionsPanel title="What you may do as Technical Director" rows={TD_PERMISSIONS} />
        <PermissionsPanel title="Not part of this role" rows={TD_NOT_PERMITTED}>
          <p className="hint" style={{ marginBottom: 0 }}>
            Written down so it can be checked after testing; a change is made in the policy and in this list
            together.
          </p>
        </PermissionsPanel>
      </div>
    </div>
  );
}

function PermissionsPanel({
  title,
  rows,
  children,
}: {
  readonly title: string;
  readonly rows: typeof TD_PERMISSIONS;
  readonly children?: ReactNode;
}) {
  return (
    <Panel title={title}>
      <table className="td-permissions">
        <tbody>
          {rows.map((p) => (
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
      {children}
    </Panel>
  );
}

/** Every change to a player in the last 30 days (BR176). */
async function ActivityTab({ client, link }: { readonly client: SupabaseClient; readonly link: ClubLink }) {
  const season = link.season;
  const activity = await loadPlayerActivity(client, link.clubId, 30);
  const registrationOf =
    season === null
      ? new Map<string, string>()
      : await registrationsByPerson(client, link.clubId, season.id, activity.map((a) => a.personId));
  const days = activityByDay(activity);
  return (
    <Panel title="Player activity" meta={`${activity.length} IN 30 DAYS`}>
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
                      {reg === undefined ? activityLine(r) : <a href={`/registrar/players/${reg}`}>{activityLine(r)}</a>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
