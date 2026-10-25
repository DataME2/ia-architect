import type { SupabaseClient } from '@supabase/supabase-js';

import {
  loadFixturesWithPositions,
  loadNightAnswers,
  loadNightMarks,
  loadNights,
  loadTeamMinutes,
} from '../../../data/academy.ts';
import { loadCheckInPlayers, loadSessions, loadWellbeing } from '../../../data/check-in.ts';
import { loadRoster, loadTeamFixtures, type ClubLink } from '../../../data/me.ts';
import type { IsoDate } from '../../../domain/types.ts';
import {
  RANGES,
  awayReasons,
  type NightSummary,
  type PlayerMinutes,
  minutesByPosition,
  nightLabel,
  periodOf,
  summariseNights,
  type Range,
} from '../../../web/academy.ts';
import {
  SESSION_KINDS,
  entriesMade,
  followUpLine,
  followUps,
  sessionsByDay,
  teamAverages,
  type EntriesMade,
  type FollowUp,
  type MeasureAverage,
  type SessionDay,
} from '../../../web/check-in.ts';
import { nextFixture, shortDate, type FixtureLike } from '../../../web/me-view.ts';
import { displayNameFor } from '../../../web/queue-view.ts';
import { AssistantNote } from '../../_components/AssistantNote.tsx';
import { ComingSoon, Metrics, Panel } from '../_workspaces/shared.tsx';
import { GameTimeBars } from './GameTimeBars.tsx';
import { TrainingNightForm } from './TrainingNightForm.tsx';

interface Team {
  readonly id: string;
  readonly name: string;
  readonly age_group: string | null;
  readonly academy: boolean;
}

/**
 * The Technical Director's Academy tab (scope 113, after the Superdesign
 * draft *Technical Director · Academy*): academy teams, one or all, over a
 * day, a week or a month. Every figure is counted from rows the viewer may
 * read (BR186), and a panel with nothing behind it yet says so.
 */
export async function AcademyTab({
  client,
  link,
  today,
  teamId,
  range,
  hrefFor,
}: {
  readonly client: SupabaseClient;
  readonly link: ClubLink;
  readonly today: IsoDate;
  readonly teamId: string | null;
  readonly range: Range;
  readonly hrefFor: (p: { readonly tab?: string; readonly team?: string | null; readonly range?: Range }) => string;
}) {
  const season = link.season;
  if (season === null) return <p className="empty">No season is set up yet, so there are no teams.</p>;

  const { data } = await client
    .from('team')
    .select('id, name, age_group, academy')
    .eq('club_id', link.clubId)
    .eq('season_id', season.id)
    .order('name');
  const teams = (data ?? []) as Team[];
  if (teams.length === 0) return <p className="empty">No teams this season yet.</p>;
  const marked = teams.filter((t) => t.academy);
  // BR184: the academy is the teams a Technical Lead marked. Until one is,
  // every team is shown, and the tab says so.
  const academy = marked.length > 0 ? marked : teams;
  const chosen = academy.find((t) => t.id === teamId) ?? null;
  const shown = chosen === null ? academy : [chosen];
  const shownIds = new Set(shown.map((t) => t.id));
  const period = periodOf(today, range);

  const [rosters, fixtures, nights, checkInPlayers, minutes] = await Promise.all([
    Promise.all(shown.map((t) => loadRoster(client, link.clubId, season.id, t.id))),
    Promise.all(shown.map((t) => loadTeamFixtures(client, link.clubId, season.id, t.id))),
    loadNights(client, link.clubId, [...shownIds], period.from, period.to),
    loadCheckInPlayers(client, link.clubId),
    Promise.all(shown.map(async (t) => minutesByPosition(await loadTeamMinutes(client, link.clubId, season.id, t.id)))),
  ]);
  const players = rosters.map((r) => r.filter((m) => m.role === 'player'));
  const nameOf = new Map(players.flat().map((p) => [p.person.id, displayNameFor(p.person)] as const));
  const name = (id: string) => nameOf.get(id) ?? 'A player no longer on the sheet';

  const [answers, marks] = await Promise.all([
    loadNightAnswers(client, link.clubId, nights.map((n) => n.id)),
    loadNightMarks(client, link.clubId, nights.map((n) => n.id)),
  ]);
  const training = shown.map((t, i) =>
    summariseNights({
      nights: nights.filter((n) => n.teamId === t.id),
      playerIds: (players[i] ?? []).map((p) => p.person.id),
      answers,
      marks,
      today,
    }),
  );
  const reasons = awayReasons({ nights, answers, marks });
  const attended = training.reduce((n, s) => n + s.trained + s.late, 0);
  const expected = training.reduce((n, s) => n + s.expected, 0);

  const lastDay = period.to < today ? period.to : today;
  const played = fixtures.flat().filter((f) => f.playedOn >= period.from && f.playedOn <= lastDay);
  const withPositions = await loadFixturesWithPositions(client, played.map((f) => f.id));

  // BR184: the players asked to check in, once each even on two teams.
  const asked = [...new Map(checkInPlayers.filter((p) => shownIds.has(p.teamId)).map((p) => [p.personId, p] as const)).values()];
  const askedIds = asked.map((p) => p.personId);
  const [wellbeing, sessions] = await Promise.all([
    loadWellbeing(client, link.clubId, askedIds, period.from, period.to),
    loadSessions(client, link.clubId, askedIds, period.from, period.to),
  ]);
  const made = entriesMade({ players: asked, wellbeing, sessions, from: period.from, to: period.to, today });
  const checkedIn = made.reduce((n, m) => n + m.checkedIn, 0);
  const daysAsked = made.reduce((n, m) => n + m.asked, 0);
  const averages = teamAverages(wellbeing, period.from, period.to);
  const follow = followUps(wellbeing, period.from, period.to);
  const days = sessionsByDay(sessions, period.from, period.to);

  const calendar = [
    ...nights.filter((n) => !n.cancelled).map((n) => ({ on: n.heldOn, what: `${shown.find((t) => t.id === n.teamId)?.name ?? ''} training`, when: nightLabel(n).split(' · ')[1] ?? '' })),
    ...fixtures.flatMap((fs, i) =>
      fs.filter((f) => f.playedOn >= period.from && f.playedOn <= period.to).map((f) => ({ on: f.playedOn, what: `${shown[i]?.name ?? ''} v ${f.opponent}`, when: '' })),
    ),
  ].sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0));

  return (
    <AcademyView
      clubId={link.clubId}
      seasonName={season.name}
      today={today}
      range={range}
      hrefFor={hrefFor}
      anyMarked={marked.length > 0}
      academy={academy}
      chosen={chosen}
      shown={shown}
      training={training}
      reasons={reasons}
      attended={attended}
      expected={expected}
      playedCount={played.length}
      positionedCount={withPositions.size}
      askedCount={asked.length}
      made={made}
      checkedIn={checkedIn}
      daysAsked={daysAsked}
      averages={averages}
      follow={follow}
      days={days}
      sessionCount={sessions.length}
      minutes={minutes}
      fixtures={fixtures}
      calendar={calendar}
      name={name}
    />
  );
}

/** The tab's panels, from rows already counted: also what the design preview renders. */
export function AcademyView({
  clubId,
  seasonName,
  today,
  range,
  hrefFor,
  anyMarked,
  academy,
  chosen,
  shown,
  training,
  reasons,
  attended,
  expected,
  playedCount,
  positionedCount,
  askedCount,
  made,
  checkedIn,
  daysAsked,
  averages,
  follow,
  days,
  sessionCount,
  minutes,
  fixtures,
  calendar,
  name,
}: {
  readonly clubId: string;
  readonly seasonName: string;
  readonly today: IsoDate;
  readonly range: Range;
  readonly hrefFor: (p: { readonly tab?: string; readonly team?: string | null; readonly range?: Range }) => string;
  readonly anyMarked: boolean;
  readonly academy: readonly { readonly id: string; readonly name: string }[];
  readonly chosen: { readonly id: string; readonly name: string } | null;
  readonly shown: readonly { readonly id: string; readonly name: string }[];
  readonly training: readonly NightSummary[];
  readonly reasons: readonly { readonly reason: string; readonly count: number }[];
  readonly attended: number;
  readonly expected: number;
  readonly playedCount: number;
  readonly positionedCount: number;
  readonly askedCount: number;
  readonly made: readonly EntriesMade[];
  readonly checkedIn: number;
  readonly daysAsked: number;
  readonly averages: readonly MeasureAverage[];
  readonly follow: readonly FollowUp[];
  readonly days: readonly SessionDay[];
  readonly sessionCount: number;
  readonly minutes: readonly (readonly PlayerMinutes[])[];
  readonly fixtures: readonly (readonly FixtureLike[])[];
  readonly calendar: readonly { readonly on: IsoDate; readonly what: string; readonly when: string }[];
  readonly name: (personId: string) => string;
}) {
  const rangeMeta = RANGES.find((r) => r.key === range)?.meta ?? '';
  return (
    <>
      <div className="academy-filters">
        <form method="get" action="/me" className="academy-team-filter">
          <input type="hidden" name="role" value="technical" />
          <input type="hidden" name="club" value={clubId} />
          <input type="hidden" name="tab" value="academy" />
          <input type="hidden" name="range" value={range} />
          <select name="team" defaultValue={chosen?.id ?? ''} aria-label="Team">
            <option value="">{anyMarked ? 'All academy teams' : 'All teams'}</option>
            {academy.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className="secondary">
            Show
          </button>
        </form>
        <nav className="segmented" aria-label="Range">
          {RANGES.map((r) => (
            <a key={r.key} href={hrefFor({ team: chosen?.id ?? null, range: r.key })} aria-current={r.key === range ? 'page' : undefined}>
              {r.label}
            </a>
          ))}
        </nav>
      </div>
      {!anyMarked && (
        <p className="callout wait">
          No team is marked as an academy team yet, so every team is shown. Mark them on the <a href={hrefFor({ tab: 'squads' })}>Squads</a> tab; the
          daily check-in reaches only academy teams of U13 or older (BR184).
        </p>
      )}

      <Metrics
        items={[
          { label: 'Training attendances', value: expected === 0 ? '—' : `${attended} of ${expected}`, note: rangeMeta.toLowerCase() },
          { label: 'Matches with game time', value: playedCount === 0 ? '—' : `${positionedCount} of ${playedCount}`, note: 'positions recorded' },
          { label: 'Check-ins', value: daysAsked === 0 ? '—' : `${checkedIn} of ${daysAsked}`, note: 'days asked, from consent' },
        ]}
      />

      <div className="cols">
        <div className="stack">
          <Panel title="Training attendance" meta={rangeMeta}>
            <table className="sheet">
              <thead>
                <tr>
                  <th scope="col">Team</th>
                  <th scope="col">Nights</th>
                  <th scope="col">Attended</th>
                  <th scope="col">Away</th>
                  <th scope="col">Still to answer</th>
                  <th scope="col">Not marked</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t, i) => {
                  const s = training[i];
                  if (s === undefined) return null;
                  return (
                    <tr key={t.id}>
                      <th scope="row">{t.name}</th>
                      <td>{s.nights}</td>
                      <td>{s.expected === 0 ? '—' : `${s.trained + s.late} of ${s.expected}`}</td>
                      <td>{s.away}</td>
                      <td>{s.noAnswer}</td>
                      <td>{s.unmarked}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {reasons.length > 0 && (
              <>
                <p className="mono academy-label">Reasons given</p>
                <p className="academy-chips">
                  {reasons.map((r) => (
                    <span key={r.reason} className="pill">
                      {r.reason} {r.count}
                    </span>
                  ))}
                </p>
              </>
            )}
            <p className="hint" style={{ marginBottom: 0 }}>
              Attended is trained or late, of the player-nights held. Away is marked as not training, or said not
              available. The reasons are as players and coaches wrote them, for the coaches and Technical Leads only
              (BR62).
            </p>
            <details className="td-team">
              <summary>Add a training night</summary>
              <TrainingNightForm clubId={clubId} teams={shown} />
            </details>
          </Panel>

          <Panel title="Wellbeing · U13 and older" meta="TEAM AVERAGE · 1–10">
            {askedCount === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No player here is asked to check in. The check-in reaches academy teams of U13 or older, once a
                guardian (or the player, from 18) has agreed (BR184, BR185).
              </p>
            ) : (
              <>
                <div className="wb-tiles">
                  {averages.map((a) => (
                    <WellbeingTile key={a.scale.key} average={a} />
                  ))}
                </div>
                <p className="hint">
                  <span aria-hidden="true">🔒</span> Seen by these teams&rsquo; coaches and the Technical Leads only. Not
                  managers, not teammates (BR186).
                </p>
                <p className="mono academy-label">Asked to follow up</p>
                {follow.length === 0 ? (
                  <p className="empty" style={{ margin: 0 }}>
                    No answer at the end of a scale {range === 'day' ? 'today' : `this ${range}`}.
                  </p>
                ) : (
                  <ul className="roster">
                    {follow.map((f) => (
                      <li key={`${f.personId}-${f.scale.key}`}>
                        <span>
                          <span className="pill pill-warn">Follow up</span>{' '}
                          <span className="who">{name(f.personId)}</span>{' '}
                          <span className="why">{followUpLine(f, today)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Panel>

          <Panel title="Entries made" meta={rangeMeta}>
            {made.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                Nobody here is asked to check in yet.
              </p>
            ) : (
              <table className="sheet">
                <thead>
                  <tr>
                    <th scope="col">Player</th>
                    <th scope="col">Check-ins</th>
                    <th scope="col">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {made.map((m) => (
                    <tr key={m.personId}>
                      <th scope="row">{name(m.personId)}</th>
                      <td>{m.asked === 0 ? 'Not agreed yet' : `${m.checkedIn} of ${m.asked}`}</td>
                      <td>{m.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel title="Game time" meta={`${chosen?.name ?? 'BY TEAM'} · ${seasonName}`.toUpperCase()}>
            {shown.map((t, i) => {
              const next = nextFixture(fixtures[i] ?? [], today);
              const last = (fixtures[i] ?? []).filter((f) => f.playedOn <= today).at(-1);
              const body = (
                <>
                  <GameTimeBars rows={minutes[i] ?? []} nameOf={name} />
                  <p className="academy-links">
                    {next !== null && (
                      <a className="button" href={`/me/game-time/${next.id}?${new URLSearchParams({ club: clubId })}`}>
                        Track the next match live
                      </a>
                    )}
                    {last !== undefined && (
                      <a href={`/me/game-time/${last.id}?${new URLSearchParams({ club: clubId })}`}>
                        Enter after the match ({shortDate(last.playedOn)})
                      </a>
                    )}
                  </p>
                </>
              );
              return shown.length === 1 ? (
                <div key={t.id}>{body}</div>
              ) : (
                <details key={t.id} className="td-team" open={i === 0}>
                  <summary>{t.name}</summary>
                  {body}
                </details>
              );
            })}
          </Panel>

          <Panel title="RPE" meta={`SESSIONS ENTERED · ${rangeMeta}`}>
            {sessionCount === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No session entered {range === 'day' ? 'today' : `this ${range}`}.
              </p>
            ) : (
              <SessionChart days={days} />
            )}
          </Panel>

          <ComingSoon title="Game reflections" waitsOn="scope 112's WP5">
            After a match, each player rates their game, says what went well and what to do better, and a coach
            replies.
          </ComingSoon>
          <ComingSoon title="Player reports" waitsOn="scope 112's WP7 and question #113">
            Coaches write a report; only a Technical Lead releases it to the player and their guardian.
          </ComingSoon>
          <AssistantNote kind="explaining">
            These are counts and averages of what players entered. Nothing here is a diagnosis; a follow-up is a
            conversation, decided by a person (BR187).
          </AssistantNote>

          <Panel title="Calendar" meta={rangeMeta}>
            {calendar.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>
                No training night or match {range === 'day' ? 'today' : `this ${range}`}.
              </p>
            ) : (
              <ul className="roster">
                {calendar.map((c, i) => (
                  <li key={`${c.on}-${i}`}>
                    <span className="mono hint">
                      {shortDate(c.on)} {c.when}
                    </span>
                    <span className="who">{c.what}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <ComingSoon title="Team chat" waitsOn="the club's safeguarding policy (question #111)">
            A chat for each team, with guardians included for players under 18. Until the club decides how adults
            message children, team notices are planned instead.
          </ComingSoon>
        </div>
      </div>
    </>
  );
}

/** One measure: the average, and its line day by day. Slate only: no measure is coloured good or bad. */
function WellbeingTile({ average }: { readonly average: MeasureAverage }) {
  const points = average.byDay
    .map((v, i) => (v === null ? null : { x: average.byDay.length === 1 ? 50 : (i / (average.byDay.length - 1)) * 100, y: 30 - ((v - 1) / 9) * 26 }))
    .filter((p): p is { x: number; y: number } => p !== null);
  const said = average.byDay.map((v) => (v === null ? 'none' : String(v))).join(', ');
  return (
    <div className="wb-tile">
      <p className="mono">{average.scale.label}</p>
      <p className="wb-value">{average.average ?? '—'}</p>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label={`${average.scale.label} by day: ${said}`}>
        {points.length > 1 && <polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} />}
        {points.length === 1 && points[0] !== undefined && <circle cx={points[0].x} cy={points[0].y} r="2.5" />}
      </svg>
      <p className="hint">{average.scale.higherIsBetter ? 'higher is better' : 'higher is worse'}</p>
    </div>
  );
}

/** Sessions each day, stacked by type (counts add up); the day's average RPE printed above. */
function SessionChart({ days }: { readonly days: readonly SessionDay[] }) {
  const most = Math.max(...days.map((d) => d.total), 1);
  return (
    <>
      <p className="gt-legend">
        {SESSION_KINDS.map((k) => (
          <span key={k.key} className="gt-key">
            <span className={`gt-swatch rpe-${k.key}`} aria-hidden="true" />
            {k.label}
          </span>
        ))}
      </p>
      <div className="rpe-chart">
        {days.map((d) => (
          <div key={d.day} className="rpe-day">
            <span className="mono rpe-avg">{d.averageRpe ?? ''}</span>
            <span
              className="rpe-bar"
              role="img"
              aria-label={`${shortDate(d.day)}: ${d.total} ${d.total === 1 ? 'session' : 'sessions'}${d.averageRpe === null ? '' : `, average RPE ${d.averageRpe}`}`}
              style={{ height: `${(d.total / most) * 100}%` }}
            >
              {SESSION_KINDS.map((k) =>
                d.counts[k.key] > 0 ? <span key={k.key} className={`rpe-${k.key}`} style={{ flexGrow: d.counts[k.key] }} /> : null,
              )}
            </span>
            <span className="mono rpe-label">{days.length <= 7 ? shortDate(d.day).slice(0, 3) : d.day.slice(8)}</span>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginBottom: 0 }}>
        Each bar counts the sessions players entered that day; the number above is their average RPE, 1 very, very
        easy to 10 maximal.
      </p>
    </>
  );
}
