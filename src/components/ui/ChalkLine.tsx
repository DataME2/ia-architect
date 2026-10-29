import * as React from 'react';
import { cn } from '@/lib/utils';

type Point = readonly [x: number, y: number];

export interface ChalkLineProps extends Omit<React.SVGProps<SVGPathElement>, 'd' | 'from' | 'to'> {
  /** In the enclosing SVG's own units. */
  readonly from: Point;
  readonly to: Point;
  /** How far the curve bows to the left of travel, as a share of its length. */
  readonly bend?: number;
}

const r = (n: number) => Math.round(n * 10) / 10;

/**
 * A chalk line (DESIGN.md, scope 124): an SVG path, computed from its two
 * ends, that draws itself over `--dur-chalk`. It goes inside an SVG. Key
 * it on what it points at, so a new target redraws it. Under reduced motion
 * it appears already drawn.
 */
export function ChalkLine({ from, to, bend = 0.2, className, ...props }: ChalkLineProps) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2 + (y2 - y1) * bend;
  const cy = (y1 + y2) / 2 - (x2 - x1) * bend;
  return (
    <path
      d={`M${r(x1)} ${r(y1)}Q${r(cx)} ${r(cy)} ${r(x2)} ${r(y2)}`}
      pathLength={1}
      fill="none"
      strokeLinecap="round"
      className={cn('stroke-signal [stroke-dasharray:1] motion-safe:animate-chalk', className)}
      {...props}
    />
  );
}
