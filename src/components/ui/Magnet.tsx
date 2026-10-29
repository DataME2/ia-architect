import * as React from 'react';
import { cn } from '@/lib/utils';

// globals.css paints every <button> in the accent and recolours it on hover,
// so each tone states its hover too.
const toneClasses = {
  home: 'bg-magnet-home text-magnet-foreground hover:bg-magnet-home! hover:text-magnet-foreground!',
  away: 'bg-magnet-away text-magnet-foreground hover:bg-magnet-away! hover:text-magnet-foreground!',
  you: 'bg-magnet-you text-magnet-you-foreground hover:bg-magnet-you! hover:text-magnet-you-foreground!',
} as const;

const sizeClasses = {
  /** 52px, a player: the number at 19px bold, which is large text. */
  player: 'size-[52px] text-[19px]',
  /** 96px, a role. */
  role: 'size-24 text-base',
} as const;

export interface MagnetProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** What a screen reader hears: "#9 Okafor, Striker" (DESIGN.md). Required. */
  readonly 'aria-label': string;
  /** Home and away are team colours, never a status; "you" is the viewer. */
  readonly tone?: keyof typeof toneClasses;
  readonly size?: keyof typeof sizeClasses;
  /** Pops it and rings it in chalk yellow, and sets aria-pressed. */
  readonly selected?: boolean;
  /**
   * Its spot on the board in per cent, as `--x` and `--y`, which place it
   * by `left` and `top`. A change glides it there on the springy ease.
   */
  readonly at?: { readonly x: number; readonly y: number };
}

/**
 * A magnet (DESIGN.md, scope 124): the one thing on the board that moves,
 * so it is always a real button and a tap always does it. Nothing needs
 * dragging. Round and raised, with an inset shade and a drop. Under
 * reduced motion it jumps to its spot instead of gliding.
 */
export const Magnet = React.forwardRef<HTMLButtonElement, MagnetProps>(
  ({ tone = 'home', size = 'player', selected = false, at, className, style, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'magnet inline-grid place-items-center rounded-full border-0 p-0 font-mono font-bold leading-none',
        'shadow-magnet hover:shadow-magnet! cursor-pointer select-none',
        at && 'absolute left-(--x) top-(--y) -translate-x-1/2 -translate-y-1/2',
        'transition-[left,top,scale] duration-(--dur-magnet) ease-magnet motion-reduce:transition-none',
        selected && 'scale-114 ring-4 ring-signal',
        toneClasses[tone],
        sizeClasses[size],
        className
      )}
      style={at ? ({ '--x': `${at.x}%`, '--y': `${at.y}%`, ...style } as React.CSSProperties) : style}
      {...props}
    >
      {children}
    </button>
  )
);

Magnet.displayName = 'Magnet';
