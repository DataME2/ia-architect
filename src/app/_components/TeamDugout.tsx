'use client';

import { useMemo, useState, type ReactNode } from 'react';

import { ChalkLine } from '../../components/ui/ChalkLine.tsx';
import { Magnet } from '../../components/ui/Magnet.tsx';
import { PinnedCard } from '../../components/ui/PinnedCard.tsx';
import {
  AVAILABILITY_LABEL,
  FORMATION_NAMES,
  STATUS_LABEL,
  lineUp,
  type DugoutOfficial,
  type DugoutPlayer,
  type FormationName,
  type Line,
} from '../../web/dugout.ts';

const LINE_LABEL: Readonly<Record<Line, string>> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defence',
  midfielder: 'Midfield',
  forward: 'Attack',
};

const POSITION_WORD: Readonly<Record<string, string>> = {
  goalkeeper: 'Goalkeeper',
  defender: 'Defender',
  midfielder: 'Midfielder',
  forward: 'Forward',
  utility: 'Utility',
};

/** Where the coach stands: the touchline at halfway, in the pitch's metres. */
const TECHNICAL_AREA = [67, 52.5] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * The pitch in metres, 68 across and 105 long with the own goal at the
 * bottom. On its side (from 64rem) the same drawing is turned a quarter, so
 * a point (x, y) lands at (105 − y, x), which is how globals.css turns the
 * magnets' `--x` and `--y`.
 */
function Pitch({ landscape, children }: { readonly landscape: boolean; readonly children: ReactNode }) {
  return (
    <svg
      className={`dugout-lines ${landscape ? 'is-landscape' : 'is-portrait'}`}
      viewBox={landscape ? '0 0 105 68' : '0 0 68 105'}
      aria-hidden="true"
    >
      <g transform={landscape ? 'matrix(0 1 -1 0 105 0)' : undefined}>
        <rect x="1" y="1" width="66" height="103" />
        <line x1="1" y1="52.5" x2="67" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <circle cx="34" cy="52.5" r="0.6" className="spot" />
        <rect x="13.85" y="1" width="40.3" height="16.5" />
        <rect x="24.85" y="1" width="18.3" height="5.5" />
        <circle cx="34" cy="12" r="0.6" className="spot" />
        <rect x="13.85" y="87.5" width="40.3" height="16.5" />
        <rect x="24.85" y="98.5" width="18.3" height="5.5" />
        <circle cx="34" cy="93" r="0.6" className="spot" />
        <circle cx={TECHNICAL_AREA[0]} cy={TECHNICAL_AREA[1]} r="1.3" className="tech" />
        {children}
      </g>
    </svg>
  );
}

/**
 * The Team Dugout (scopes 99 and 124): the squad as magnets on a tactics
 * board, the chosen player's card pinned beside it, and the bench and the
 * technical area as straight records.
 *
 * Every decision (who starts, who sits and why) is `lineUp` in
 * `src/web/dugout.ts`; this only draws it. Each player is a Magnet, so the
 * board is walked with the keyboard like any list and a tap always does it.
 * The magnets run out when the board first draws and glide on the springy
 * ease when the formation changes, since each keeps its key. Picking one
 * draws a chalk line to it from the technical area. None of it moves under
 * `prefers-reduced-motion`. The card says the verdict, never an amount
 * (BR78).
 */
export function TeamDugout({
  teamName,
  players,
  officials,
  fixtureLabel,
}: {
  readonly teamName: string;
  readonly players: readonly DugoutPlayer[];
  readonly officials: readonly DugoutOfficial[];
  /** "Next: v Rival United, Sat 18 Oct" — what the magnets' answers are for. */
  readonly fixtureLabel: string | null;
}) {
  const [formation, setFormation] = useState<FormationName>('4-3-3');
  const [selected, setSelected] = useState<string | null>(null);

  const { slots, bench } = useMemo(() => lineUp(players, formation), [players, formation]);
  const chosen = players.find((p) => p.id === selected) ?? null;
  const starting = slots.filter((s) => s.player !== null).length;
  const spot = slots.find((s) => s.player !== null && s.player.id === selected);
  const line =
    spot === undefined ? null : (
      <ChalkLine
        key={`${spot.player!.id}-${formation}`}
        from={TECHNICAL_AREA}
        to={[(spot.x / 100) * 68, (spot.y / 100) * 105]}
        strokeWidth={0.7}
      />
    );
  const toggle = (id: string) => setSelected(selected === id ? null : id);

  return (
    <section className="dugout" aria-label={`${teamName}: the Team Dugout`}>
      <header className="dugout-head">
        <div>
          <p className="eyebrow">Team Dugout</p>
          <h3 className="dugout-title">{teamName}</h3>
          <p className="hint" style={{ margin: 0 }}>
            Tap a magnet. Switch the shape and watch them move.
          </p>
          <p className="hint" style={{ margin: 0 }}>
            {starting} of 11 fit to start &middot; {bench.length} on the bench
            {fixtureLabel !== null && <> &middot; {fixtureLabel}</>}
          </p>
        </div>
        <div className="chips" role="group" aria-label="Formation">
          {FORMATION_NAMES.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={f === formation} onClick={() => setFormation(f)}>
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="dugout-body">
        <div className="dugout-board">
          <Pitch landscape={false}>{line}</Pitch>
          <Pitch landscape>{line}</Pitch>
          {slots.map((s, i) =>
            s.player === null ? (
              <span
                key={`open-${s.line}-${i}`}
                className="dugout-open"
                style={{ ['--x' as string]: `${s.x}%`, ['--y' as string]: `${s.y}%` }}
                title={`${LINE_LABEL[s.line]}: open`}
                aria-hidden="true"
              >
                open
              </span>
            ) : (
              <Magnet
                key={s.player.id}
                at={{ x: s.x, y: s.y }}
                selected={selected === s.player.id}
                className={`dugout-magnet${s.player.availability === 'unanswered' ? ' is-unanswered' : ''}`}
                style={{ ['--delay' as string]: `${i * 55}ms` }}
                aria-label={`${s.player.name}, ${LINE_LABEL[s.line]}${
                  s.player.number === null ? '' : `, number ${s.player.number}`
                }`}
                onClick={() => toggle(s.player!.id)}
              >
                {s.player.number ?? '·'}
                <span className="nm">{s.player.shortName}</span>
              </Magnet>
            ),
          )}
        </div>

        <div className="dugout-side">
          <div aria-live="polite">
            <PinnedCard key={chosen?.id ?? 'none'} tilt={-1.2} className="dugout-pin">
              {chosen === null ? (
                <>
                  <p className="dugout-pin-kind">Player card</p>
                  <p className="dugout-pin-name">Tap a magnet</p>
                  <p className="hint" style={{ margin: 0 }}>
                    Their card pins here. Only players who may take the field start; the rest sit on the bench with
                    the reason.
                  </p>
                </>
              ) : (
                <>
                  <p className="dugout-pin-kind">
                    {chosen.number === null ? 'No number' : `#${chosen.number}`} &middot;{' '}
                    {[chosen.preferred, chosen.secondary]
                      .filter((p): p is NonNullable<typeof p> => p !== null)
                      .map((p) => POSITION_WORD[p])
                      .join(' / ') || 'No position recorded'}
                  </p>
                  <p className="dugout-pin-name">{chosen.name}</p>
                  <p className="dugout-pin-pills">
                    <span
                      className={
                        chosen.status === 'clear' ? 'pill pill-ok' : chosen.status === 'awaiting' ? 'pill pill-warn' : 'pill pill-stop'
                      }
                    >
                      {STATUS_LABEL[chosen.status]}
                    </span>
                    {chosen.availability !== null && (
                      <span
                        className={
                          chosen.availability === 'available'
                            ? 'pill pill-ok'
                            : chosen.availability === 'not_available'
                              ? 'pill pill-warn'
                              : 'pill'
                        }
                      >
                        {AVAILABILITY_LABEL[chosen.availability]}
                      </span>
                    )}
                  </p>
                </>
              )}
            </PinnedCard>
          </div>

          <section className="card dugout-record">
            <h4>Bench</h4>
            {bench.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>Nobody on the bench.</p>
            ) : (
              <ul className="dugout-bench">
                {bench.map((b) => (
                  <li key={b.player.id}>
                    <button type="button" aria-pressed={selected === b.player.id} onClick={() => toggle(b.player.id)}>
                      <span className="num">{b.player.number ?? '·'}</span>
                      <span className="nm">{b.player.shortName}</span>
                      {b.reason !== null && (
                        <span className={b.reason === 'Not clear to play' || b.reason === 'Not registered' ? 'pill pill-stop' : 'pill pill-warn'}>
                          {b.reason}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card dugout-record">
            <h4>Technical area</h4>
            {officials.length === 0 ? (
              <p className="empty" style={{ margin: 0 }}>No team official on this sheet yet.</p>
            ) : (
              <ul className="dugout-officials">
                {officials.map((o, i) => (
                  <li key={`${o.name}-${o.role}-${i}`} style={{ ['--delay' as string]: `${400 + i * 80}ms` }}>
                    <span className={`badge${o.role === 'Technical Director' ? ' is-td' : ''}`} aria-hidden="true">
                      {initials(o.name)}
                    </span>
                    <span>
                      <b>{o.name}</b>
                      <span className="hint">{o.role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
