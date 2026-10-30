'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/** What counts as a card: the hand-written screens' and the design system's. */
const CARDS = ':is(.card, .panel, .dash-card, .dash-metric, .paper, .callout, .stat, .ds-panel, .ds-card)';

/**
 * The workspaces in motion (scope 129): on every club screen and in /me,
 * the cards still below the fold rise into place as they scroll in, a few
 * at a time, as the front door's sections do (ScrollReveal, scope 118).
 *
 * It runs again on each page and each tab, since Next keeps the frame and
 * swaps the content. Only the outermost card moves, so a card inside a panel
 * does not move twice. Nothing above the fold is ever hidden, a card
 * scrolled past is shown too, and without script or under reduced motion
 * nothing is marked at all, so nothing is hidden.
 */
export function WorkspaceMotion() {
  const path = usePathname();
  const query = useSearchParams().toString();

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.querySelector<HTMLElement>('.ws-content');
    if (root === null) return;

    const outermost = [...root.querySelectorAll<HTMLElement>(CARDS)].filter((el) => {
      const outer = el.parentElement?.closest(CARDS);
      return outer === null || outer === undefined || !root.contains(outer);
    });
    // A card already waiting is picked up again: an earlier run of this
    // effect may have marked it and been cleaned up before it scrolled in.
    const below = outermost.filter(
      (el) => el.dataset.reveal === 'waiting' || (el.dataset.reveal === undefined && el.getBoundingClientRect().top > innerHeight),
    );

    // A scroll check, not an IntersectionObserver: a jump (End, a link to an
    // anchor) can carry a card from below the window to above it without it
    // ever intersecting, and it must still be shown.
    let waiting = below;
    for (const el of waiting) el.dataset.reveal = 'waiting';
    let frame = 0;
    const check = () => {
      frame = 0;
      let n = 0;
      waiting = waiting.filter((el) => {
        if (el.getBoundingClientRect().top > innerHeight * 0.94) return true;
        el.style.transitionDelay = `${(n++ % 4) * 70}ms`;
        el.dataset.reveal = 'shown';
        // The stagger is for arriving; a later hover should not wait for it.
        el.addEventListener('transitionend', () => el.style.removeProperty('transition-delay'), { once: true });
        return false;
      });
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(check);
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    onScroll();
    return () => {
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [path, query]);

  return null;
}
