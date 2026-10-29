'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';

import { indexPosition, pageReveal, percent, runwayProgress, stationAt, stationT } from '../../web/home-motion.ts';
import { PEOPLE, ROLE_VIEWS, alsoHolds, indexAfterKey, rolesHeldBy, type RoleView } from '../../web/home-story.ts';

/**
 * When the study pins. It must match the media query on `.ed-study-runway`
 * in globals.css: a wide, tall enough screen, and motion allowed.
 */
const PINNED = '(min-width: 64rem) and (min-height: 42rem) and (prefers-reduced-motion: no-preference)';

const N = ROLE_VIEWS.length;
const pad = (n: number) => String(n).padStart(2, '0');

/** One person and the roles they hold, the page's own role in oxide. */
function HeldBy({ view }: { readonly view: RoleView }) {
  const person = PEOPLE[view.person];
  const held = rolesHeldBy(view.person);
  const rowY = (i: number) => 24 + i * (held.length > 1 ? 112 / (held.length - 1) : 0) + (held.length > 1 ? 0 : 56);

  return (
    <figure className="ed-held">
      <svg viewBox="0 0 260 160" aria-hidden="true" focusable="false">
        {held.map((r, i) => (
          <line key={r.id} className={`ed-held-line${r.id === view.id ? ' is-on' : ''}`} x1={66} y1={80} x2={150} y2={rowY(i)} />
        ))}
        <circle className="ed-person" cx={44} cy={80} r={24} />
        <text className="ed-svg-serif" x={44} y={87} textAnchor="middle">
          {person.initials}
        </text>
        {held.map((r, i) => (
          <g key={r.id} className={`ed-node${r.id === view.id ? ' is-on' : ''}`}>
            <rect x={152} y={rowY(i) - 5} width={10} height={10} />
            <text className="ed-svg-label" x={170} y={rowY(i) + 4}>
              {r.short.toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        {person.name}: one record, {held.length === 1 ? 'one role' : `${held.length} roles`}.
      </figcaption>
    </figure>
  );
}

/**
 * The study as a matchday programme (scope 122): eight pages, one per role,
 * and a contents index down the side. As the section scrolls, the marker
 * runs down the index and each page wipes in over the last. Scrolling back
 * lifts the pages off again. Every role is also a tab, so nobody has to
 * scroll to a place to use it.
 *
 * **One position drives everything.** It sets the marker, the oxide rule
 * down the index, each page's wipe and the Index readout. While scrolling,
 * that position is the pinned section's progress. Once a role is chosen,
 * it is that role's page, until the scroll reaches another. The other
 * readouts are counted from the same data the pages show.
 *
 * Where nothing pins (narrow or short screens, reduced motion), the pages
 * are ordinary flow and only the chosen one shows. The marker then stands
 * at its row, with no wipe. The scroll handler writes the marker, the wipes
 * and the readout directly, and React renders only when the page changes.
 * The pages not being read are inert, so focus and screen readers stay on
 * the one in view.
 */
export function ProgrammeStudy() {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const chosen = useRef<number | null>(null);
  const reached = useRef(-1);
  const runway = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const rule = useRef<HTMLSpanElement>(null);
  const path = useRef<HTMLElement>(null);
  const pages = useRef<(HTMLElement | null)[]>([]);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const place = useCallback((p: number) => {
    const pick = chosen.current;
    const t = pick === null ? p : stationT(pick, N);
    const at = `${(indexPosition(t, N) * 100).toFixed(3)}%`;
    if (marker.current) marker.current.style.top = at;
    if (rule.current) rule.current.style.height = at;
    if (path.current) path.current.textContent = `${percent(t)}%`;
    pages.current.forEach((el, i) => {
      const w = pick === null ? pageReveal(p, i, N) : i <= pick ? 1 : 0;
      el?.style.setProperty('--w', w.toFixed(4));
    });
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
        chosen.current = activeRef.current;
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
      place(p);
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
  const start = `${(indexPosition(0, N) * 100).toFixed(3)}%`;

  return (
    <div ref={runway} className="ed-study-runway">
      <div ref={stage} className="ed-study-stage">
        <header className="ed-study-head">
          <p className="ed-eyebrow">§ 02 — The programme</p>
          <h2 id="study-title" className="ed-h2">
            Eight roles. <em>One record</em> each.
          </h2>
          <p className="ed-intro">
            A page for each role at a club, as its holder sees it. Scroll and the pages turn; choose a
            role from the contents to go straight to it. A demonstration with invented people.
          </p>
        </header>

        <div className="ed-index">
          <div className="ed-index-line" aria-hidden="true">
            <span ref={rule} className="ed-index-rule" style={{ height: start }} />
            <span ref={marker} className="ed-index-marker" style={{ top: start }} />
          </div>
          <div className="ed-index-tabs" role="tablist" aria-label="Contents: the roles" aria-orientation="vertical" onKeyDown={onKeyDown}>
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
                aria-controls={`study-page-${r.id}`}
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
        </div>

        <div className="ed-pages">
          {ROLE_VIEWS.map((v, i) => {
            const holder = PEOPLE[v.person];
            const also = alsoHolds(v.id);
            return (
              <article
                key={v.id}
                ref={(el) => {
                  pages.current[i] = el;
                }}
                id={`study-page-${v.id}`}
                className={`ed-page${i === active ? ' is-active' : ''}`}
                role="tabpanel"
                aria-labelledby={`study-tab-${v.id}`}
                inert={i !== active}
                style={{ '--w': i === 0 ? 1 : 0 } as CSSProperties}
              >
                <p className="ed-page-no" aria-hidden="true">
                  {pad(i + 1)}
                </p>
                <div className="ed-page-head">
                  <p className="ed-label">
                    {v.label} · {holder.name}
                  </p>
                  <h3 className="ed-h3">{v.screen.title}</h3>
                  <p className="ed-page-problem">{v.problem}</p>
                </div>
                <ul className="ed-page-rows">
                  {v.rows.map((r) => (
                    <li key={r.label}>
                      <span>{r.label}</span>
                      <span className={`ed-status ed-status-${r.status.tone}`}>{r.status.word}</span>
                    </li>
                  ))}
                </ul>
                <div className="ed-page-side">
                  <HeldBy view={v} />
                  <p className="ed-page-boundary">
                    <strong>Never in this view.</strong> {v.boundary}
                  </p>
                  {also.length > 0 && (
                    <p className="ed-page-also">
                      Also {holder.name}’s:{' '}
                      {also.map((r, k) => (
                        <span key={r.id}>
                          {k > 0 && ', '}
                          <button type="button" onClick={() => choose(ROLE_VIEWS.indexOf(r))}>
                            {r.label}
                          </button>
                        </span>
                      ))}
                      . Each is its own view (BR61).
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <dl className="ed-readouts">
          <div>
            <dt>Page</dt>
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
              {rolesHeldBy(view.person).length} of {N}
            </dd>
          </div>
          <div>
            <dt>Index</dt>
            <dd ref={path}>0%</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
