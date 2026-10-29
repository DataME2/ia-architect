import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PinnedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Degrees, between −1.5 and 1.2 (DESIGN.md). Vary it down a column. */
  readonly tilt?: number;
}

/**
 * A task card pinned to the board (DESIGN.md, scope 124): ruled paper, a
 * red pin and a slight tilt. Only work gets one. A record stays a straight
 * Card or Panel.
 *
 * `.paper` (globals.css) restates the Whiteboard tokens on the card, so its
 * text is dark ink, its statuses are the light ones and its primary button
 * is a felt pill, on felt or on the Whiteboard alike. It drops in and
 * settles at its tilt; pass `animationDelay` to stagger a column by 90ms.
 * Under reduced motion it is simply there.
 */
export function PinnedCard({ tilt = -1, className, style, children, ...props }: PinnedCardProps) {
  return (
    <div
      className={cn(
        'paper relative rounded-card shadow-card p-ds-4 pt-ds-5 font-sans',
        'bg-surface bg-[repeating-linear-gradient(transparent_0_27px,var(--card-rule)_27px_28px)]',
        'rotate-(--tilt) motion-safe:animate-pin',
        "before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2",
        'before:size-4 before:rounded-full before:bg-magnet-home before:shadow-xs',
        className
      )}
      style={{ '--tilt': `${tilt}deg`, ...style } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
