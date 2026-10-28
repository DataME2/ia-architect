'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { STUDY_ARC, arcPath, arcPoint, percent, runwayProgress, stationAt, stationT } from '../../web/home-motion.ts';
import { PEOPLE, ROLE_VIEWS, alsoHolds, indexAfterKey, rolesHeldBy } from '../../web/home-story.ts';

/**
 * When the study pins. It must match the media query on `.ed-study-runway`
 * in globals.css: a wide, tall enough screen, and motion allowed.
 */
const PINNED = '(min-width: 64rem) and (min-height: 42rem) and (prefers-reduced-motion: no-preference)';

const N = ROLE_VIEWS.length;
const ARC = arcPath(STUDY_ARC);
const STATIONS = ROLE_VIEWS.map((role, i) => {
  const t = stationT(i, N);
  const at = arcPoint(STUDY_ARC, t);
  // Labels sit outside the arc, clear of the marker; the two end stations'
  // go underneath, where the arc leaves room.
  const end = i === 0 || i === ROLE_VIEWS.length - 1;
  const label = end ? { x: at.x, y: at.y + 30 } : arcPoint({ ...STUDY_ARC, r: STUDY_ARC.r + 32 }, t);
  return { role, t, at, label };
});
const START = arcPoint(STUDY_ARC, 0);
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The role study (scope 120): eight roles, five fictional people, and one
 * record each. A marker travels an arc of the eight roles as the section
 * scrolls, and the role it reaches opens its workspace. Scrolling back
 * reverses it. Every role is also a tab, so nobody has to scroll to a
 * place to use it.
 *
 * **One position drives everything.** The marker, the oxide progress along
 * the arc and the Path readout all come from one number. While scrolling,
 * that number is the pinned section's progress. Once a role is chosen, it
 * is that role's station, until the scroll reaches another station. The
 * readouts are counted from the same data the drawing draws.
 *
 * Where nothing pins (narrow or short screens, reduced motion), the study
 * is ordinary flow. The marker then stands still at the chosen role: the
 * same relationship, without the movement. The scroll handler writes the
 * marker and the readout directly, and React renders only when the role
 * changes.
 */
export function RoleStudy() {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const chosen = useRef<number | null>(null);
  const reached = useRef(-1);
  const runway = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGSVGElement>(null);
  const marker = useRef<SVGGElement>(null);
  const path = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const place = useCallback((t: number) => {
    const at = arcPoint(STUDY_ARC, t);
    drawing.current?.style.setProperty('--t', t.toFixed(4));
    if (marker.current) marker.current.style.transform = `translate(${at.x}px, ${at.y}px)`;
    if (path.current) path.current.textContent = `${percent(t)}%`;
  }, []);

  const choose = (i: number) => {
    chosen.current = i;
    activeRef.current = i;
    setActive(i);
    place(stationT(i, N));
  };

  useEffect(() => {
    const pinned = window.matchMedia(PINNED);
    let frame = 0;

    const measure = () => {
      frame = 0;
      const box = runway.current;
      const st = stage.current;
      if (box === null || st === null) return;
      if (!pinned.matches) {
        place(stationT(activeRef.current, N));
        return;
      }
      const offset = Number.parseFloat(getComputedStyle(st).top) || 0;
      const r = box.getBoundingClientRect();
      const p = runwayProgress(r.top, r.height, st.offsetHeight, offset);
      const s = stationAt(p, N);
      if (s !== reached.current) {
        reached.current = s;
        chosen.current = null;
        if (s !== activeRef.current) {
          activeRef.current = s;
          setActive(s);
        }
      }
      place(chosen.current === null ? p : stationT(chosen.current, N));
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };
    const remeasure = () => {
      reached.current = -1;
      schedule();
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    pinned.addEventListener('change', remeasure);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      pinned.removeEventListener('change', remeasure);
      window.cancelAnimationFrame(frame);
    };
  }, [place]);

  const onKeyDown = (event: KeyboardEvent) => {
    const next = indexAfterKey(active, event.key, N);
    if (next === active) return;
    event.preventDefault();
    choose(next);
    tabs.current[next]?.focus();
  };

  const view = ROLE_VIEWS[active];
  if (view === undefined) return null;
  const person = PEOPLE[view.person];
  const held = rolesHeldBy(view.person);
  const also = alsoHolds(view.id);
  const centre = { x: STUDY_ARC.cx, y: STUDY_ARC.cy };

  return (
    <div ref={runway} className="ed-study-runway">
      <div ref={stage} className="ed-study-stage">
        <header className="ed-study-head">
          <p className="ed-eyebrow">§ 02 — The study</p>
          <h2 id="study-title" className="ed-h2">
            Eight roles. <em>One record</em> each.
          </h2>
          <p className="ed-intro">
            Scroll, or choose a role. The marker follows the roles across the arc; the person in the
            middle stays the same while the view changes. A demonstration with invented people.
          </p>
        </header>

        <div className="ed-study-tabs" role="tablist" aria-label="Roles in the study" aria-orientation="vertical" onKeyDown={onKeyDown}>
          {ROLE_VIEWS.map((r, i) => (
            <button
              key={r.id}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              id={`study-tab-${r.id}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-controls="study-panel"
              tabIndex={i === active ? 0 : -1}
              onClick={() => choose(i)}
            >
              <span className="ed-study-num" aria-hidden="true">
                {pad(i + 1)}
              </span>
              {r.label}
            </button>
          ))}
        </div>

        <figure className="ed-study-figure">
          <svg ref={drawing} viewBox="0 0 640 440" aria-hidden="true" focusable="false" style={{ '--t': 0 } as CSSProperties}>
            <path className="ed-study-arc" d={ARC} />
            <path className="ed-study-progress" d={ARC} pathLength={1} />
            {STATIONS.map((s, i) => {
              const mine = s.role.person === view.person;
              return mine ? (
                <line
                  key={s.role.id}
                  className={`ed-study-spoke${i === active ? ' is-on' : ''}`}
                  x1={centre.x}
                  y1={centre.y}
                  x2={s.at.x}
                  y2={s.at.y}
                />
              ) : null;
            })}
            {STATIONS.map((s, i) => (
              <g
                key={s.role.id}
                className={`ed-study-station${s.role.person === view.person ? ' is-held' : ''}${i === active ? ' is-on' : ''}`}
              >
                <rect x={s.at.x - 5} y={s.at.y - 5} width={10} height={10} />
                <text className="ed-svg-label" x={s.label.x} y={s.label.y + 4} textAnchor="middle">
                  {s.role.short.toUpperCase()}
                </text>
              </g>
            ))}
            <circle className="ed-person" cx={centre.x} cy={centre.y} r={36} />
            <text className="ed-svg-serif ed-study-initials" x={centre.x} y={centre.y + 8} textAnchor="middle">
              {person.initials}
            </text>
            <text className="ed-svg-label" x={centre.x} y={centre.y + 62} textAnchor="middle">
              {person.name.toUpperCase()} · ONE RECORD
            </text>
            <g ref={marker} className="ed-study-marker" style={{ transform: `translate(${START.x}px, ${START.y}px)` }}>
              <circle r={12} />
              <circle r={5} />
            </g>
          </svg>
          <figcaption className="ed-legend">
            <span className="ed-legend-held">Held by {person.name}</span>
            <span className="ed-legend-other">Held by someone else</span>
          </figcaption>
        </figure>

        {/* Keyed by the role, so the workspace re-enters with each one. */}
        <div key={view.id} id="study-panel" className="ed-study-panel" role="tabpanel" aria-labelledby={`study-tab-${view.id}`} tabIndex={0}>
          <p className="ed-label">
            {view.label} · {person.name}
          </p>
          <h3 className="ed-h3">{view.screen.title}</h3>
          <p className="ed-study-problem">{view.problem}</p>
          <ul className="ed-study-rows">
            {view.rows.map((r) => (
              <li key={r.label}>
                <span>{r.label}</span>
                <span className={`ed-status ed-status-${r.status.tone}`}>{r.status.word}</span>
              </li>
            ))}
          </ul>
          <p className="ed-study-boundary">
            <strong>Never in this view.</strong> {view.boundary}
          </p>
          {also.length > 0 && (
            <p className="ed-study-also">
              {person.name} also holds{' '}
              {also.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ' and '}
                  <button type="button" onClick={() => choose(ROLE_VIEWS.indexOf(r))}>
                    {r.label}
                  </button>
                </span>
              ))}
              . Each is its own view (BR61).
            </p>
          )}
        </div>

        <dl className="ed-readouts">
          <div>
            <dt>Role</dt>
            <dd>
              {pad(active + 1)} / {pad(N)}
            </dd>
          </div>
          <div>
            <dt>Holder</dt>
            <dd>{person.name}</dd>
          </div>
          <div>
            <dt>Roles held</dt>
            <dd>
              {held.length} of {N}
            </dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd ref={path}>0%</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
