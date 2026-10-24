'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';

import { POSITION_SHORT, totalMinutes } from '../../../web/academy.ts';
import { LINES, type Line } from '../../../web/dugout.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import {
  NEW_MATCH,
  NEXT_LABEL,
  advance,
  clockLabel,
  elapsed,
  onPitch,
  place,
  trackedGameTime,
  type TrackerState,
} from '../../../web/match-tracker.ts';
import { FormNotice } from '../../registrar/_components/FormNotice.tsx';
import { saveGameTimeAction } from './actions.ts';

export interface EntryPlayer {
  readonly personId: string;
  readonly name: string;
  readonly started: boolean;
  readonly positions: Readonly<Partial<Record<Line, number>>>;
}

/**
 * Game time for one fixture (scope 112, WP3): tracked live from the
 * touchline, or entered after the match. Both save the same thing: minutes
 * in each position, and who started.
 */
export function GameTimeEntry({
  clubId,
  fixtureId,
  players,
}: {
  readonly clubId: string;
  readonly fixtureId: string;
  readonly players: readonly EntryPlayer[];
}) {
  const [mode, setMode] = useState<'live' | 'after'>('live');
  return (
    <div className="stack">
      <div className="gt-modes" role="group" aria-label="How to record game time">
        <button type="button" className={mode === 'live' ? '' : 'secondary'} aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
          Track live
        </button>
        <button type="button" className={mode === 'after' ? '' : 'secondary'} aria-pressed={mode === 'after'} onClick={() => setMode('after')}>
          Enter after the match
        </button>
      </div>
      {mode === 'live' ? (
        <LiveTracker clubId={clubId} fixtureId={fixtureId} players={players} />
      ) : (
        <AfterTheMatch clubId={clubId} fixtureId={fixtureId} players={players} />
      )}
    </div>
  );
}

function SaveForm({
  clubId,
  fixtureId,
  children,
  label,
}: {
  readonly clubId: string;
  readonly fixtureId: string;
  readonly children: ReactNode;
  readonly label: string;
}) {
  const [state, formAction, pending] = useActionState(saveGameTimeAction, IDLE_FORM);
  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="fixtureId" value={fixtureId} />
      {children}
      <FormNotice result={state} />
      <p style={{ margin: 0 }}>
        <button type="submit" disabled={pending}>
          {pending ? 'Working…' : label}
        </button>
      </p>
    </form>
  );
}

function AfterTheMatch({ clubId, fixtureId, players }: { readonly clubId: string; readonly fixtureId: string; readonly players: readonly EntryPlayer[] }) {
  return (
    <SaveForm clubId={clubId} fixtureId={fixtureId} label="Save game time">
      <table className="sheet">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Started</th>
            {LINES.map((p) => (
              <th scope="col" key={p}>
                {POSITION_SHORT[p]} min
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((pl) => (
            <tr key={pl.personId}>
              <th scope="row">{pl.name}</th>
              <td>
                <input type="checkbox" name={`started:${pl.personId}`} defaultChecked={pl.started} aria-label={`${pl.name} started`} />
              </td>
              {LINES.map((p) => (
                <td key={p}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={200}
                    name={`min:${pl.personId}:${p}`}
                    defaultValue={pl.positions[p] ?? ''}
                    aria-label={`${pl.name}, minutes as ${p}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SaveForm>
  );
}

const storageKey = (fixtureId: string) => `pitchpeople:tracker:${fixtureId}`;

function LiveTracker({ clubId, fixtureId, players }: { readonly clubId: string; readonly fixtureId: string; readonly players: readonly EntryPlayer[] }) {
  const [state, setState] = useState<TrackerState>(NEW_MATCH);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // The match lives in this browser, so a reload or a lost signal at the
  // ground loses nothing. Storage can be unavailable; the tracker still runs.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey(fixtureId));
      if (saved !== null) setState(JSON.parse(saved) as TrackerState);
    } catch {
      // Private window or blocked storage: start fresh.
    }
    setReady(true);
  }, [fixtureId]);
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey(fixtureId), JSON.stringify(state));
    } catch {
      // Nothing to do: the match is still on screen.
    }
  }, [fixtureId, ready, state]);
  useEffect(() => {
    if (state.runningSince === null) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [state.runningSince]);

  const where = onPitch(state);
  const result = trackedGameTime(state, now);
  const next = NEXT_LABEL[state.phase];
  const act = (f: (s: TrackerState, t: number) => TrackerState) => {
    const t = Date.now();
    setNow(t);
    setState((s) => f(s, t));
  };

  return (
    <div className="stack">
      <div className="gt-clock">
        <span className="gt-time mono">
          {clockLabel(elapsed(state, now))}
        </span>
        <span className="hint">{state.phase === 'half-time' ? 'Half time' : state.phase === 'full-time' ? 'Full time' : `${where.size} on the pitch`}</span>
        {next !== null && (
          <button type="button" onClick={() => act(advance)}>
            {next}
          </button>
        )}
      </div>
      <ul className="gt-live">
        {players.map((pl) => {
          const row = result.find((r) => r.personId === pl.personId);
          return (
            <li key={pl.personId}>
              <span className="gt-name">
                {pl.name}
                <span className="mono hint"> {row === undefined ? 0 : totalMinutes(row)} min</span>
              </span>
              <select
                value={where.get(pl.personId) ?? ''}
                disabled={state.phase === 'full-time'}
                onChange={(e) => {
                  const value = e.target.value;
                  act((s, t) => place(s, pl.personId, value === '' ? null : (value as Line), t));
                }}
                aria-label={`Where ${pl.name} is playing`}
              >
                <option value="">Bench</option>
                {LINES.map((p) => (
                  <option key={p} value={p}>
                    {POSITION_SHORT[p]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
      {state.phase === 'full-time' && (
        <SaveForm clubId={clubId} fixtureId={fixtureId} label="Save game time">
          {result.flatMap((r) => [
            ...(r.started ? [<input key={`s${r.personId}`} type="hidden" name={`started:${r.personId}`} value="on" />] : []),
            ...LINES.flatMap((p) =>
              (r.positions[p] ?? 0) > 0
                ? [<input key={`${r.personId}${p}`} type="hidden" name={`min:${r.personId}:${p}`} value={String(r.positions[p])} />]
                : [],
            ),
          ])}
          <p className="hint" style={{ margin: 0 }}>
            {result.length} {result.length === 1 ? 'player' : 'players'} with minutes. Saving replaces what was recorded for
            them in this game.
          </p>
        </SaveForm>
      )}
      {state.phase !== 'before' && (
        <p style={{ margin: 0 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (window.confirm('Start this match again? The tracked minutes are cleared.')) setState(NEW_MATCH);
            }}
          >
            Start again
          </button>
        </p>
      )}
    </div>
  );
}
