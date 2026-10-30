'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A card that leans toward the pointer (scope 129), as a printed card does
 * when you pick it up. Mouse only: a finger or a pen gets a still card, and
 * reduced motion gets nothing. It holds no state and re-renders nothing;
 * the lean is written straight to the element's style and reset on leave.
 */
export function TiltCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const lean = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-4px)`;
  };
  const settle = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.removeProperty('transform');
  };

  return (
    <div
      onPointerMove={lean}
      onPointerLeave={settle}
      className={cn('transition-transform duration-(--dur) ease-out motion-reduce:transition-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
