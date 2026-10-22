'use client';

import { useEffect, useState } from 'react';

import { LENSES, LENS_PERSON, lensAt, nextLens } from '../../web/home-story.ts';

/**
 * The hero's person card (scope 100): one person who never changes, while
 * the lens turns through the roles they hold (Principle P1).
 *
 * The ring spins in CSS; the card's role line turns here, every 2.5 s,
 * unless the reader has asked for reduced motion. On a phone the ring would
 * not fit beside the card, so the roles become a row of chips under it —
 * and a chip, once tapped, holds the lens on that role rather than turning
 * it away from what the reader chose.
 */
export function PersonLens() {
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setInterval(() => setAt((i) => nextLens(i)), 2500);
    return () => clearInterval(timer);
  }, [held]);

  const lens = lensAt(at);

  return (
    <div className="lens-wrap">
      <div className="lens">
        <div className="lens-ring" aria-hidden="true">
          {LENSES.map((l, i) => (
            <span key={l.role} className={`lens-chip lens-chip-${i}`}>
              <span>{l.role}</span>
            </span>
          ))}
        </div>

        <div className="lens-card">
          <span className="lens-avatar" aria-hidden="true">
            {LENS_PERSON.initials}
          </span>
          <p className="lens-name">{LENS_PERSON.name}</p>
          <p className="lens-since">{LENS_PERSON.since}</p>
          <p className="lens-role">{lens.role}</p>
          <span className={`pill pill-${lens.tone}`}>{lens.line}</span>
        </div>

        <div className="lens-picks" role="group" aria-label="See this person as">
          {LENSES.map((l, i) => (
            <button
              key={l.role}
              type="button"
              aria-pressed={i === at}
              onClick={() => {
                setAt(i);
                setHeld(true);
              }}
            >
              <span>{l.role}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="lens-note">An illustration: everyone on this page is fictional.</p>
    </div>
  );
}
