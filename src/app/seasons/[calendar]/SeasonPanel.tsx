'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  GROUPS,
  competitionLabel,
  journeyOf,
  keyDatesIn,
  monthsOf,
  playDate,
  pulse,
  readCell,
  shortDate,
  slotsOn,
  type Group,
  type Kind,
  type SeasonCalendar,
  type Slot,
} from '../../../web/season-calendar.ts';

const KINDS: readonly { readonly kind: Kind; readonly label: string }[] = [
  { kind: 'round', label: 'Round' },
  { kind: 'catch-up', label: 'Catch-up' },
  { kind: 'finals', label: 'Finals & cup ties' },
  { kind: 'play-off', label: 'Play-off' },
  { kind: 'pre-season', label: 'Pre-season & grading' },
  { kind: 'admin', label: 'Nominations & draw' },
  { kind: 'event', label: 'Carnival & event' },
];

/**
 * The season walked month by month (scope 101).
 *
 * The pulse at the top is the whole year at a glance — one bar per weekend,
 * as tall as the number of competitions on the field — and doubles as the
 * month picker. Below it, a month is its weekends as cards, because a
 * football season is planned by weekend: a day grid would leave five empty
 * weekdays in every row and hide the midweek fixtures that do exist.
 *
 * Following a competition holds its row of the calendar beside the month,
 * so "where are we up to?" is answered without reading every card.
 */
export function SeasonPanel({ calendar: cal }: { readonly calendar: SeasonCalendar }) {
  const months = useMemo(() => monthsOf(cal), [cal]);
  const [at, setAt] = useState(0);
  const [groups, setGroups] = useState<ReadonlySet<Group> | null>(null);
  const [follow, setFollow] = useState('');

  // Open on this month while the season is on; on its first month otherwise.
  // `?follow=` arrives from a team's competition on the teams screen (BR179).
  // Read after hydration: the page is prerendered, so the query string is
  // the browser's to know, not the server's.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('follow');
    const comp = cal.competitions.find((c) => c.id === wanted);
    if (comp) {
      setFollow(comp.id);
      const first = journeyOf(comp).firstRound;
      const i = first ? months.findIndex((m) => m.weekends.some((w) => w.friday === first)) : -1;
      if (i >= 0) setAt(i);
    }

    const now = new Date();
    const i = months.findIndex((m) => m.month0 === now.getMonth());
    if (now.getFullYear() === cal.season && i >= 0) setAt(i);
  }, [cal.competitions, cal.season, months]);

  // Only the groups this calendar has: South Coast has no Advanced Juniors.
  const present = useMemo(() => GROUPS.filter((g) => cal.competitions.some((c) => c.group === g.id)), [cal]);
  const beat = useMemo(() => pulse(cal, groups), [cal, groups]);
  const peak = Math.max(1, ...beat);
  const followed = cal.competitions.find((c) => c.id === follow) ?? null;
  const month = months[at] ?? months[0];
  if (!month) return null;

  const firstIndex = months.slice(0, at).reduce((n, m) => n + m.weekends.length, 0);
  const inPlay = new Set(
    month.weekends.flatMap((w) => {
      const s = slotsOn(cal, w.friday, groups);
      return [...s.weekend, ...s.midweek].filter((x) => x.entry.kind !== 'admin').map((x) => x.competition.id);
    }),
  ).size;
  const holidays = month.weekends.filter((w) => w.schoolHoliday).length;
  const keyDates = keyDatesIn(cal, month.month0);

  const toggle = (g: Group) => {
    const next = new Set(groups ?? []);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setGroups(next.size === 0 || next.size === present.length ? null : next);
  };

  return (
    <div className="season">
      <section className="season-pulse" aria-label="The season at a glance">
        <div className="season-pulse-head">
          <h3>The season’s pulse</h3>
          <p className="hint">Each bar is a weekend, as tall as the competitions playing on it. Pick a month.</p>
        </div>
        <div className="season-pulse-months">
          {months.map((m, mi) => {
            const start = months.slice(0, mi).reduce((n, x) => n + x.weekends.length, 0);
            const busiest = Math.max(0, ...m.weekends.map((_, wi) => beat[start + wi] ?? 0));
            return (
              <button
                key={m.month0}
                type="button"
                className="season-pulse-month"
                aria-pressed={mi === at}
                aria-label={`${m.label}: ${m.weekends.length} weekends, up to ${busiest} competitions on one`}
                onClick={() => setAt(mi)}
              >
                <span className="season-bars" aria-hidden="true">
                  {m.weekends.map((w, wi) => {
                    const n = beat[start + wi] ?? 0;
                    return (
                      <span
                        key={w.friday}
                        className={`season-bar${w.schoolHoliday ? ' is-holiday' : ''}${w.noGames ? ' is-off' : ''}${
                          followed?.plan[w.friday] ? ' is-followed' : ''
                        }`}
                        style={{ ['--h' as string]: `${Math.max(4, (n / peak) * 100)}%` }}
                      />
                    );
                  })}
                </span>
                <span className="season-pulse-label">{m.label.slice(0, 3)}</span>
              </button>
            );
          })}
        </div>
        <p className="season-key" aria-hidden="true">
          <span className="season-swatch is-play" /> Games <span className="season-swatch is-holiday" /> School holidays{' '}
          <span className="season-swatch is-off" /> No games
          {followed && (
            <>
              {' '}
              <span className="season-swatch is-followed" /> {followed.name}
            </>
          )}
        </p>
      </section>

      <section className="season-controls" aria-label="Choose what to see">
        <div className="season-groups" role="group" aria-label="Competition groups">
          <button type="button" aria-pressed={groups === null} onClick={() => setGroups(null)}>
            All
          </button>
          {present.map((g) => (
            <button key={g.id} type="button" aria-pressed={groups?.has(g.id) ?? false} onClick={() => toggle(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
        <label className="season-follow">
          <span>Follow a competition</span>
          <select value={follow} onChange={(e) => setFollow(e.target.value)}>
            <option value="">None</option>
            {present.map((g) => (
              <optgroup key={g.id} label={g.label}>
                {cal.competitions
                  .filter((c) => c.group === g.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {competitionLabel(c, cal.competitions)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      {followed && <FollowCard cal={cal} id={followed.id} monthStart={firstIndex} monthLength={month.weekends.length} />}

      <section className="season-month" aria-labelledby="season-month-title">
        <header className="season-month-head">
          <button type="button" className="secondary" aria-label="Previous month" disabled={at === 0} onClick={() => setAt(at - 1)}>
            ‹
          </button>
          <div>
            <h3 id="season-month-title">
              {month.label} <span>{cal.season}</span>
            </h3>
            <p className="season-month-sum">
              {month.weekends.length} weekends · {inPlay} competitions in play
              {holidays > 0 && ` · ${holidays} school-holiday weekend${holidays === 1 ? '' : 's'}`}
              {month.weekends.some((w) => w.noGames) && ` · ${month.weekends.find((w) => w.noGames)?.noGames}: no games`}
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            aria-label="Next month"
            disabled={at === months.length - 1}
            onClick={() => setAt(at + 1)}
          >
            ›
          </button>
        </header>

        <ol className="season-weekends" key={`${month.month0}-${follow}-${groups ? [...groups].join() : 'all'}`}>
          {month.weekends.map((w, wi) => {
            const { weekend: all, midweek } = slotsOn(cal, w.friday, groups);
            // South Coast's community seniors play the Wednesday before this
            // weekend (scope 103), so they get their own block, dated, first.
            const weekday = all.filter((s) => s.competition.playedOn);
            const weekend = all.filter((s) => !s.competition.playedOn);
            const firstWeekday = weekday[0]?.competition;
            const mine = followed ? readCell(followed.plan[w.friday] ?? '') : [];
            return (
              <li key={w.friday} className={`season-weekend${w.noGames ? ' is-off' : ''}`} style={{ ['--i' as string]: wi }}>
                <header>
                  <h4>{w.label}</h4>
                  {w.schoolHoliday && <span className="season-tag is-holiday">School holidays</span>}
                  {w.otherHoliday && <span className="season-tag is-other">{w.otherHoliday}</span>}
                  {w.noGames && <span className="season-tag is-off">{w.noGames} · no games</span>}
                </header>
                {followed && mine.length > 0 && (
                  <p className="season-mine">
                    <b>{followed.name}</b> {mine.map((e) => `${e.text}${e.midweek ? ' (midweek)' : ''}`).join(', ')}
                    {followed.playedOn && `, ${followed.playedOn} ${shortDate(playDate(followed, w.friday))}`}
                  </p>
                )}
                {firstWeekday && (
                  <div className="season-weekday">
                    <p>
                      Commencing {firstWeekday.playedOn} {shortDate(playDate(firstWeekday, w.friday))} · Monday rounds are
                      played prior
                    </p>
                    <Slots slots={weekday} cal={cal} follow={follow} />
                  </div>
                )}
                {w.noGames ? (
                  <p className="hint">Nothing is scheduled: the whole state rests for {w.noGames}.</p>
                ) : weekend.length === 0 ? (
                  <p className="hint">No competition games this weekend.</p>
                ) : (
                  <Slots slots={weekend} cal={cal} follow={follow} />
                )}
                {midweek.length > 0 && (
                  <div className="season-midweek">
                    <p>Midweek, after this weekend</p>
                    <Slots slots={midweek} cal={cal} follow={follow} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {keyDates.length > 0 && (
          <aside className="season-dates" aria-label={`Key dates in ${month.label}`}>
            <h4>Key dates in {month.label}</h4>
            <ul>
              {keyDates.map((k) => (
                <li key={`${k.name}-${k.when}`}>
                  <span className={`season-level is-${k.kind.toLowerCase()}`}>
                    {k.kind === 'window' ? 'Registration' : k.kind}
                  </span>
                  <span>
                    <b>{k.name}</b>
                    <span className="hint">
                      {k.when}
                      {k.place && ` · ${k.place}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </section>

      <p className="season-legend" aria-label="What the colours mean">
        {KINDS.map((k) => (
          <span key={k.kind} className={`season-chip is-${k.kind}`}>
            {k.label}
          </span>
        ))}
      </p>
    </div>
  );
}

/** One weekend's games, by group — "Seniors: NPL Men R7, QPL 1 Men R7 …". */
function Slots({ slots, cal, follow }: { readonly slots: readonly Slot[]; readonly cal: SeasonCalendar; readonly follow: string }) {
  return (
    <div className="season-slots">
      {GROUPS.map((g) => {
        const mine = slots.filter((s) => s.competition.group === g.id);
        if (mine.length === 0) return null;
        return (
          <div key={g.id} className="season-slot-group">
            <p>{g.label}</p>
            <ul>
              {mine.map((s) => (
                <li
                  key={`${s.competition.id}-${s.entry.text}`}
                  className={`season-chip is-${s.entry.kind}${s.competition.id === follow ? ' is-followed' : ''}`}
                  title={`${competitionLabel(s.competition, cal.competitions)}: ${s.entry.text}`}
                >
                  {competitionLabel(s.competition, cal.competitions)} <b>{s.entry.short}</b>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** A followed competition's whole season as one strip, with this month marked. */
function FollowCard({
  cal,
  id,
  monthStart,
  monthLength,
}: {
  readonly cal: SeasonCalendar;
  readonly id: string;
  readonly monthStart: number;
  readonly monthLength: number;
}) {
  const c = cal.competitions.find((x) => x.id === id);
  if (!c) return null;
  const j = journeyOf(c);
  const fridays = monthsOf(cal).flatMap((m) => m.weekends.map((w) => w.friday));
  return (
    <section className="season-follow-card" aria-label={`${c.name}, the whole season`}>
      <div>
        <p className="eyebrow">Following</p>
        <h3>{competitionLabel(c, cal.competitions)}</h3>
        <p className="season-month-sum">
          {j.rounds} rounds{j.catchUps > 0 && ` · ${j.catchUps} catch-up weekends`}
          {j.firstRound && ` · first round ${shortDate(playDate(c, j.firstRound))}`}
          {j.grandFinal && ` · grand final ${shortDate(playDate(c, j.grandFinal))}`}
        </p>
      </div>
      <ol className="season-strip" aria-hidden="true">
        {fridays.map((f, i) => {
          const e = readCell(c.plan[f] ?? '')[0];
          const here = i >= monthStart && i < monthStart + monthLength;
          return (
            <li key={f} className={`${e ? `is-${e.kind}` : ''}${here ? ' is-here' : ''}`} title={e?.text}>
              {e && e.short.length <= 4 ? e.short : ''}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
