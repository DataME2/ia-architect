'use client';

import { useEffect } from 'react';

/**
 * Reveals the front door's sections as they scroll into view, once each
 * (scope 118).
 *
 * The page arrives with everything visible: this hides only what is still
 * below the fold after hydration, so a reader without JavaScript, with
 * reduced motion, or without `IntersectionObserver` simply sees every
 * section. A section is shown once and never hidden again, so scrolling
 * back up replays nothing.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'shown';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );

    for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
      if (el.getBoundingClientRect().top < window.innerHeight) continue;
      el.dataset.reveal = 'waiting';
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
