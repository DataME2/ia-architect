'use client';

import { useState } from 'react';

import {
  initialConditions,
  RULE_KIND_WORD,
  SEASON_PATHS,
  walkPath,
  type Conditions,
} from '../../web/season-paths.ts';

/**
 * The guide's interactive half: pick a path, switch its conditions, and see
 * where it stops (scope 117). Every decision is `walkPath`'s; this renders
 * it. Conditions live only in this tab — nothing is stored or sent.
 */
export function SeasonPaths() {
  const [activeId, setActiveId] = useState(SEASON_PATHS[0]?.id ?? '');
  const [conditions, setConditions] = useState<Record<string, Conditions>>(() =>
    Object.fromEntries(SEASON_PATHS.map((p) => [p.id, initialConditions(p)])),
  );

  const path = SEASON_PATHS.find((p) => p.id === activeId) ?? SEASON_PATHS[0];
  if (path === undefined) return null;
  const c = conditions[path.id] ?? initialConditions(path);
  const walk = walkPath(path, c);

  const set = (id: string, value: boolean | string) =>
    setConditions((all) => ({ ...all, [path.id]: { ...c, [id]: value } }));

  return (
    <div className="paths">
      <nav className="paths-tabs" aria-label="Paths">
        {SEASON_PATHS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === path.id}
            onClick={() => setActiveId(p.id)}
          >
            <span className="paths-tab-n">Path {i + 1}</span>
            <span className="paths-tab-t">{p.label}</span>
          </button>
        ))}
      </nav>

      <section className="paths-scenario" aria-labelledby={`path-${path.id}`}>
        <aside className="paths-side">
          <h3 id={`path-${path.id}`}>{path.label}</h3>
          <p className="hint">{path.intro}</p>

          <div className={`paths-outcome paths-${walk.outcome.tone}`} role="status" aria-live="polite">
            <span className="paths-state">
              <span className="paths-dot" aria-hidden="true" />
              {walk.outcome.state}
            </span>
            <p>{walk.outcome.text}</p>
          </div>

          <fieldset className="paths-conditions">
            <legend>
              Conditions
              <button type="button" onClick={() => setConditions((all) => ({ ...all, [path.id]: initialConditions(path) }))}>
                Reset
              </button>
            </legend>
            {path.conditions
              .filter((k) => k.showIf === undefined || k.showIf(c))
              .map((k) =>
                k.options ? (
                  <label key={k.id} className="paths-condition">
                    <span>{k.label}</span>
                    <select value={String(c[k.id])} onChange={(e) => set(k.id, e.target.value)}>
                      {k.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label key={k.id} className="paths-condition">
                    <span>
                      {k.label}
                      {k.hint && <small>{k.hint}</small>}
                    </span>
                    <input type="checkbox" checked={c[k.id] === true} onChange={(e) => set(k.id, e.target.checked)} />
                  </label>
                ),
              )}
          </fieldset>
        </aside>

        <ol className="paths-steps">
          {walk.steps.map((w) => (
            <li
              key={w.step.title}
              className={[w.stop ? 'paths-halt' : '', w.after ? 'paths-after' : ''].join(' ').trim() || undefined}
            >
              <span className="paths-marker" aria-hidden="true">
                {String(w.number).padStart(2, '0')}
              </span>
              <div className="paths-step">
                <div className="paths-step-head">
                  <h4>
                    <span className="sr-only">Step {w.number}: </span>
                    {w.step.title}
                  </h4>
                  <span className="paths-who">{w.step.who}</span>
                </div>
                <p>{w.step.body}</p>

                <div className="paths-screen">
                  <code>{w.step.route}</code>
                  {w.step.linkable ? (
                    <a href={w.step.route}>{w.step.linkLabel ?? 'Open this screen'}</a>
                  ) : (
                    <span>opened from the invitation link</span>
                  )}
                </div>

                {w.step.fields && (
                  <ul className="paths-fields">
                    {w.step.fields.map(([what, detail]) => (
                      <li key={what}>
                        <b>{what}:</b> {detail}
                      </li>
                    ))}
                  </ul>
                )}

                {w.rules.length > 0 && (
                  <ul className="paths-rules">
                    {w.rules.map((r) => (
                      <li key={`${r.br}-${r.text}`}>
                        <span className={`paths-kind paths-kind-${r.kind}`}>
                          <span className="paths-dot" aria-hidden="true" />
                          {RULE_KIND_WORD[r.kind]}
                        </span>
                        <span className="paths-br">{r.br}</span>
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {w.step.aside && (
                  <div className="paths-aside">
                    <p>{w.step.aside.text}</p>
                    <a className="button secondary" href={w.step.aside.href}>
                      {w.step.aside.label}
                    </a>
                  </div>
                )}

                {w.status && (
                  <div className="paths-note paths-warn">
                    <span className="paths-dot" aria-hidden="true" />
                    <span>Status: {w.status}</span>
                  </div>
                )}
                {w.warn && (
                  <div className="paths-note paths-warn">
                    <span className="paths-dot" aria-hidden="true" />
                    <span>{w.warn}</span>
                  </div>
                )}
                {w.stop && (
                  <div className="paths-note paths-stop">
                    <span className="paths-dot" aria-hidden="true" />
                    <span>{w.stop}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
