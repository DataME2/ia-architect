'use client';

import { useEffect, useRef, useState } from 'react';

import { ROLE_PREVIEWS } from '../../web/home-story.ts';

/**
 * The landing page's roles section (scope 100): the five roles on the left,
 * and a phone showing what the chosen one sees.
 *
 * From 768px the list sits beside a sticky phone, and the role crossing the
 * middle of the viewport is the one shown — the reader scrolls through the
 * roles. Below that the list is a swipeable strip above the phone, where
 * scroll position means nothing, so only a tap chooses. Hover, tap and focus
 * choose at every width, and with reduced motion they are the only way.
 */
export function RoleWorkspaces() {
  const [at, setAt] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const split = window.matchMedia('(min-width: 768px)');
    const observer = new IntersectionObserver(
      (entries) => {
        if (!split.matches) return;
        for (const entry of entries) {
          if (entry.isIntersecting) setAt(Number((entry.target as HTMLElement).dataset.role));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    for (const item of items.current) if (item) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="roles-split">
      <div className="roles-list">
        {ROLE_PREVIEWS.map((p, i) => (
          <button
            key={p.role}
            ref={(el) => {
              items.current[i] = el;
            }}
            type="button"
            data-role={i}
            className="roles-item"
            aria-pressed={i === at}
            onClick={() => setAt(i)}
            onFocus={() => setAt(i)}
            onMouseEnter={() => setAt(i)}
          >
            <strong>{p.role}</strong>
            <span>{p.summary}</span>
          </button>
        ))}
      </div>

      <div className="roles-phone-wrap">
        <div className="roles-phone">
          <div className="roles-screen">
            {ROLE_PREVIEWS.map((p, i) => (
              <div key={p.role} className="roles-view" data-on={i === at} aria-hidden={i !== at}>
                <p className="roles-view-role">{p.role}</p>
                <p className="roles-view-heading">{p.heading}</p>
                <ul>
                  {p.rows.map((r) => (
                    <li key={r.label}>
                      <span>{r.label}</span>
                      {r.status ? (
                        <span className={`pill pill-${r.status.tone}`}>{r.status.word}</span>
                      ) : (
                        <span className="roles-view-aside">{r.aside}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {p.tags ? (
                  <>
                    <p className="roles-view-role">{p.tagsHeading}</p>
                    <p className="roles-view-tags">
                      {p.tags.map((t) => (
                        <span key={t} className="pill">
                          {t}
                        </span>
                      ))}
                    </p>
                  </>
                ) : null}
                {p.action ? <span className="roles-view-action">{p.action}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
