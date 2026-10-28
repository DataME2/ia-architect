'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import { DEMO_CLUB, HERO_TABS, indexAfterKey } from '../../web/home-story.ts';

/**
 * The hero's product preview (scope 118): one fictional club's week, seen
 * as registrations, money and match day. A real tab list: the arrows move
 * between tabs, and each tab changes what the panel lists. Nothing is read;
 * the rows are `HERO_TABS`, and the panel says they are fictional.
 */
export function HeroPreview() {
  const [at, setAt] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = HERO_TABS[at] ?? HERO_TABS[0];
  if (tab === undefined) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    const next = indexAfterKey(at, event.key, HERO_TABS.length);
    if (next === at) return;
    event.preventDefault();
    setAt(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="hp">
      <div className="hp-bar">
        <span className="hp-club">{DEMO_CLUB}</span>
        <span className="pill">Fictional club</span>
      </div>

      <div className="hp-tabs" role="tablist" aria-label={`${DEMO_CLUB}, this week`} onKeyDown={onKeyDown}>
        {HERO_TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            id={`hp-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={i === at}
            aria-controls="hp-panel"
            tabIndex={i === at ? 0 : -1}
            onClick={() => setAt(i)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Keyed by the tab, so the panel re-enters with each choice. */}
      <div key={tab.id} id="hp-panel" className="hp-panel" role="tabpanel" aria-labelledby={`hp-tab-${tab.id}`}>
        <p className="hp-heading">{tab.heading}</p>
        <ul className="hp-rows">
          {tab.rows.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <span className={`pill pill-${r.status.tone}`}>{r.status.word}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
