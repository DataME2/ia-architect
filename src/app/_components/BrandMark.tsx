'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { Football, MarkPitch } from '../../components/ui/BrandMark.tsx';
import {
  BALL_FADE,
  BALL_RADIUS,
  KEY_POINTS,
  KEY_SPLINES,
  KEY_TIMES,
  list,
  MOVE_PATH,
  MOVE_SECONDS,
  NET_FLASH,
  SPIN_DEGREES,
} from '../../web/brand-mark.ts';

/**
 * The mark, with the move (scope 108): three passes across the pitch and a
 * shot into the right-hand net, which lights in volt. The mark is not a
 * status, so it may borrow the Assistant's colour. Then the ball is back on
 * the centre spot, upright, for the restart.
 *
 * Still unless asked. With `intro` (the top bar) it plays once when the
 * front door opens; everywhere it plays on hover, or when its link takes
 * keyboard focus. It never moves for anyone who has turned motion off, and
 * each run is under WCAG 2.2.2's five seconds. Every animation waits on
 * `begin="indefinite"`, so until it is started the ball sits on the spot.
 *
 * Drawn inline rather than fetched: it is smaller than the request that
 * would collect it, and there is no state in which the top bar renders
 * without its mark.
 */
export function BrandMark({ intro = false }: { readonly intro?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const onFrontDoor = usePathname() === '/';

  useEffect(() => {
    const svg = ref.current;
    if (svg === null) return;
    const play = () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      svg.querySelectorAll<SVGAnimationElement>('animate, animateMotion, animateTransform').forEach((a) => {
        a.beginElement();
      });
    };
    const trigger = svg.closest('a') ?? svg.parentElement ?? svg;
    trigger.addEventListener('mouseenter', play);
    trigger.addEventListener('focusin', play);
    if (intro && onFrontDoor) play();
    return () => {
      trigger.removeEventListener('mouseenter', play);
      trigger.removeEventListener('focusin', play);
    };
  }, [intro, onFrontDoor]);

  const timing = { dur: `${MOVE_SECONDS}s`, begin: 'indefinite', fill: 'freeze' } as const;
  const spline = { calcMode: 'spline', keyTimes: list(KEY_TIMES), keySplines: list(KEY_SPLINES) } as const;

  return (
    <svg ref={ref} className="brand-mark" viewBox="0 0 32 32" role="img" aria-label="PitchPeople" focusable="false">
      <MarkPitch />
      <g transform="translate(16 16)">
        {/* The net: taller than the ball, so it shows lit around it. */}
        <rect x="11" y="-4" width="2.8" height="8" rx="0.6" fill="#84cc16" opacity="0">
          <animate attributeName="opacity" values={list(NET_FLASH.values)} keyTimes={list(NET_FLASH.keyTimes)} {...timing} />
        </rect>
        <g>
          <animate attributeName="opacity" values={list(BALL_FADE.values)} keyTimes={list(BALL_FADE.keyTimes)} {...timing} />
          <animateMotion path={MOVE_PATH} keyPoints={list(KEY_POINTS)} {...spline} {...timing} />
          <g transform={`scale(${BALL_RADIUS})`}>
            <Football
              spin={
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values={list(SPIN_DEGREES)}
                  {...spline}
                  {...timing}
                />
              }
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
