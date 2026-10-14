'use client';

import { useMemo, useState } from 'react';

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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/**
 * The Team Dugout (scope 99): the squad on a pitch, the bench beside it, and
 * the coaches and Technical Director in the technical area.
 *
 * Every decision — who starts, who sits and why — is `lineUp` in
 * `src/web/dugout.ts`; this only draws it. The players run out when the
 * pitch first renders (a CSS animation, so it needs no script to be seen)
 * and glide when the formation changes, since each shirt keeps its key;
 * none of it under `prefers-reduced-motion`. Each shirt is a button, so the pitch is
 * walked with the keyboard like any list, and its card says the verdict,
 * never an amount (BR78).
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
  /** "Next: v Rival United, Sat 18 Oct" — what the shirts' answers are for. */
  readonly fixtureLabel: string | null;
}) {
  const [formation, setFormation] = useState<FormationName>('4-3-3');
  const [selected, setSelected] = useState<string | null>(null);

  const { slots, bench } = useMemo(() => lineUp(players, formation), [players, formation]);
  const chosen = players.find((p) => p.id === selected) ?? null;
  const starting = slots.filter((s) => s.player !== null).length;

  return (
    <section className="dugout" aria-label={`${teamName}: the Team Dugout`}>
      <header className="dugout-head">
        <div>
          <p className="eyebrow">Team Dugout</p>
          <h3>{teamName}</h3>
          <p className="hint" style={{ margin: 0 }}>
            {starting} of 11 fit to start &middot; {bench.length} on the bench
            {fixtureLabel !== null && <> &middot; {fixtureLabel}</>}
          </p>
        </div>
        <div className="dugout-formations" role="group" aria-label="Formation">
          {FORMATION_NAMES.map((f) => (
            <button
              key={f}
              type="button"
              className={f === formation ? 'is-on' : undefined}
              aria-pressed={f === formation}
              onClick={() => setFormation(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="dugout-body">
        <div className="dugout-pitch">
          <svg className="dugout-lines" viewBox="0 0 68 105" preserveAspectRatio="none" aria-hidden="true">
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
          </svg>
          {slots.map((s, i) =>
            s.player === null ? (
              <span
                key={`open-${s.line}-${i}`}
                className="dugout-open"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
                title={`${LINE_LABEL[s.line]}: open`}
                aria-hidden="true"
              >
                open
              </span>
            ) : (
              <button
                key={s.player.id}
                type="button"
                className={`dugout-shirt is-${s.line}${selected === s.player.id ? ' is-selected' : ''}${
                  s.player.availability === 'unanswered' ? ' is-unanswered' : ''
                }`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, ['--delay' as string]: `${i * 55}ms` }}
                aria-label={`${s.player.name}, ${LINE_LABEL[s.line]}${
                  s.player.number === null ? '' : `, number ${s.player.number}`
                }`}
                aria-pressed={selected === s.player.id}
                onClick={() => setSelected(selected === s.player!.id ? null : s.player!.id)}
              >
                <span className="num">{s.player.number ?? '·'}</span>
                <span className="nm">{s.player.shortName}</span>
              </button>
            ),
          )}
        </div>

        <aside className="dugout-side">
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

          <h4>Bench</h4>
          {bench.length === 0 ? (
            <p className="empty" style={{ margin: 0 }}>Nobody on the bench.</p>
          ) : (
            <ul className="dugout-bench">
              {bench.map((b) => (
                <li key={b.player.id}>
                  <button
                    type="button"
                    aria-pressed={selected === b.player.id}
                    onClick={() => setSelected(selected === b.player.id ? null : b.player.id)}
                  >
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
        </aside>
      </div>

      <div className="dugout-card" aria-live="polite">
        {chosen === null ? (
          <p className="hint" style={{ margin: 0 }}>
            Choose a player to see their card. Only players who may take the field start; the rest sit on the
            bench with the reason.
          </p>
        ) : (
          <>
            <span className="dugout-card-num" aria-hidden="true">{chosen.number ?? '·'}</span>
            <div>
              <b>{chosen.name}</b>
              <p className="hint" style={{ margin: 0 }}>
                {[chosen.preferred, chosen.secondary]
                  .filter((p): p is NonNullable<typeof p> => p !== null)
                  .map((p) => POSITION_WORD[p])
                  .join(' / ') || 'No position recorded'}
              </p>
            </div>
            <span className={chosen.status === 'clear' ? 'pill pill-ok' : chosen.status === 'awaiting' ? 'pill pill-warn' : 'pill pill-stop'}>
              {STATUS_LABEL[chosen.status]}
            </span>
            {chosen.availability !== null && (
              <span className={chosen.availability === 'available' ? 'pill pill-ok' : chosen.availability === 'not_available' ? 'pill pill-warn' : 'pill'}>
                {AVAILABILITY_LABEL[chosen.availability]}
              </span>
            )}
          </>
        )}
      </div>
    </section>
  );
}
