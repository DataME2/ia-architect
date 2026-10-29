'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import { PEOPLE, ROLE_VIEWS, alsoHolds, indexAfterKey, type RoleView } from '../../web/home-story.ts';

/** The hub's geometry, in its own viewBox: the person centred, roles round. */
const W = 360;
const H = 320;
const CX = W / 2;
const CY = H / 2;

function rolePoint(i: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / ROLE_VIEWS.length;
  return { x: CX + 128 * Math.cos(angle), y: CY + 116 * Math.sin(angle) };
}

/**
 * The role explorer (scope 118): choose a role, and see who holds it, what
 * their workspace holds, the one thing it never shows, and the other roles
 * that same person holds.
 *
 * The hub keeps the person in the middle and draws a line only to the
 * roles they hold, so it never suggests everyone holds every role. Moving
 * to one of their other roles keeps the person and moves the marker; moving
 * to someone else's role redraws the lines. Switching is always explicit
 * and shows one role at a time (BR61). The hub mirrors the tab list and is
 * hidden from assistive technology; the tab list is the control.
 */
export function RoleExplorer() {
  const [at, setAt] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const view = ROLE_VIEWS[at];
  if (view === undefined) return null;
  const person = PEOPLE[view.person];
  const also = alsoHolds(view.id);
  const marker = rolePoint(at);

  const choose = (i: number) => setAt(i);
  const chooseRole = (r: RoleView) => {
    const i = ROLE_VIEWS.indexOf(r);
    setAt(i);
    tabs.current[i]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const next = indexAfterKey(at, event.key, ROLE_VIEWS.length);
    if (next === at) return;
    event.preventDefault();
    setAt(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="rx">
      <div className="rx-tabs" role="tablist" aria-label="Choose a role" aria-orientation="vertical" onKeyDown={onKeyDown}>
        {ROLE_VIEWS.map((r, i) => (
          <button
            key={r.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`rx-tab-${r.id}`}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-controls="rx-panel"
            tabIndex={i === at ? 0 : -1}
            onClick={() => choose(i)}
          >
            <span className="rx-tab-role">{r.label}</span>
            <span className="rx-tab-who">{PEOPLE[r.person].name}</span>
          </button>
        ))}
      </div>

      <div className="rx-stage">
        <figure className="rx-hub">
          <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
            {/* Keyed by the person, so their lines draw in when they change. */}
            <g key={person.id}>
              {ROLE_VIEWS.map((r, i) => {
                const p = rolePoint(i);
                const held = r.person === person.id;
                return (
                  <line
                    key={r.id}
                    x1={CX}
                    y1={CY}
                    x2={p.x}
                    y2={p.y}
                    pathLength={1}
                    className={`rx-link${held ? ' rx-link-held' : ''}${i === at ? ' rx-link-on' : ''}`}
                  />
                );
              })}
            </g>
            {ROLE_VIEWS.map((r, i) => {
              const p = rolePoint(i);
              const held = r.person === person.id;
              return (
                <g
                  key={r.id}
                  className={`rx-node${held ? ' rx-node-held' : ''}${i === at ? ' rx-node-on' : ''}`}
                  transform={`translate(${p.x} ${p.y})`}
                >
                  <rect x={-44} y={-14} width={88} height={28} rx={14} />
                  <text textAnchor="middle" dominantBaseline="central">
                    {r.short}
                  </text>
                </g>
              );
            })}
            {/* The active-role marker travels round the ring between choices. */}
            <circle className="rx-marker" r={5} style={{ transform: `translate(${marker.x}px, ${marker.y - 22}px)` }} />
            <circle className="rx-person" cx={CX} cy={CY} r={40} />
            <text className="rx-person-initials" x={CX} y={CY} textAnchor="middle" dominantBaseline="central">
              {person.initials}
            </text>
          </svg>
          <figcaption>
            <strong>{person.name}</strong>: one Person record, holding {also.length + 1} of these roles. A solid line
            is a role they hold; the others belong to other people at the club.
          </figcaption>
        </figure>

        {/* Keyed by the role, so the workspace re-enters with each choice. */}
        <div key={view.id} id="rx-panel" className="rx-panel" role="tabpanel" aria-labelledby={`rx-tab-${view.id}`} tabIndex={0}>
          <p className="rx-who">
            <span className="rx-avatar" aria-hidden="true">
              {person.initials}
            </span>
            <span>
              <strong>{person.name}</strong>
              <span className="rx-as"> as {view.label}</span>
            </span>
          </p>
          <p className="rx-problem">{view.problem}</p>

          <div className="rx-screen">
            <div className="rx-screen-head">
              <span>{view.screen.title}</span>
              <span className="pill">Fictional</span>
            </div>
            <ul className="rx-rows">
              {view.rows.map((r) => (
                <li key={r.label}>
                  <span>{r.label}</span>
                  <span className={`pill pill-${r.status.tone}`}>{r.status.word}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="rx-boundary">
            <strong>Never in this view.</strong> {view.boundary}
          </p>
          <p className="rx-routes">
            Works from{' '}
            {view.screen.routes.map((route, i) => (
              <span key={route}>
                {i > 0 && ' and '}
                <code>{route}</code>
              </span>
            ))}
          </p>

          {also.length > 0 && (
            <div className="rx-also">
              <p>
                {person.name} also holds these roles. Each is a separate view, switched on purpose (BR61):
              </p>
              <div className="rx-also-roles">
                {also.map((r) => (
                  <button key={r.id} type="button" className="button secondary" onClick={() => chooseRole(r)}>
                    Switch to {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
