'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { enterProgress, passProgress, runwayProgress } from '../../web/home-motion.ts';

/**
 * A section whose motion follows the scroll (scope 120). It writes one
 * progress value, `--p` from 0 to 1, to its own style, and the CSS derives
 * every movement from it, so the parts stay in step and scrolling back
 * reverses them.
 *
 * - `hero`: progress through the pinned hero's short runway, measured
 *   against its `[data-stage]` child. Where nothing pins (a phone), it is
 *   progress as the hero scrolls away.
 * - `enter`: progress as the section rises into view, for the closing
 *   wordmark.
 *
 * The page arrives readable. Before script, and with reduced motion, `--p`
 * holds its resting value: 0 for the hero (unparted), 1 for the closing
 * wordmark (settled). With `intro`, the hero's opening reveal is started on
 * an animation frame after hydration (`data-intro="run"`), and the CSS
 * hides nothing unless script runs. Updates are batched to one per frame, read layout and write a
 * single custom property, and never re-render React.
 */
export function ScrollStage({
  mode,
  intro = false,
  className,
  children,
  ...aria
}: {
  readonly mode: 'hero' | 'enter';
  readonly intro?: boolean;
  readonly className: string;
  readonly children: ReactNode;
  readonly 'aria-labelledby'?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const rest = mode === 'enter' ? 1 : 0;

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (still.matches) {
        el.style.setProperty('--p', String(rest));
        return;
      }
      const box = el.getBoundingClientRect();
      let p: number;
      if (mode === 'enter') {
        p = enterProgress(box.top, box.height, window.innerHeight);
      } else {
        const stage = el.querySelector<HTMLElement>('[data-stage]') ?? el;
        const offset = Number.parseFloat(getComputedStyle(stage).top) || 0;
        p =
          box.height > stage.offsetHeight
            ? runwayProgress(box.top, box.height, stage.offsetHeight, offset)
            : passProgress(box.top, box.height, offset);
      }
      el.style.setProperty('--p', p.toFixed(4));
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    still.addEventListener('change', schedule);

    // The opening: two frames, so the starting pose is painted before the
    // reveal begins.
    let opening = 0;
    if (intro) {
      opening = window.requestAnimationFrame(() => {
        opening = window.requestAnimationFrame(() => {
          el.dataset.intro = 'run';
        });
      });
    }

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      still.removeEventListener('change', schedule);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(opening);
    };
  }, [mode, intro, rest]);

  return (
    <section ref={ref} className={className} style={{ '--p': rest } as CSSProperties} {...aria}>
      {children}
    </section>
  );
}
