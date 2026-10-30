'use client';

import * as React from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  /** A real URL (`?tab=…`), so a tab is linkable, survives a reload and works without script. */
  readonly href: string;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly current: string;
  /** Names the navigation landmark: "Club settings". */
  readonly label: string;
  readonly className?: string;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Tabs as the board draws them (scope 127): a row of 2px pill strips, the
 * current one in chalk yellow. Each tab is a link, so the server renders
 * the right panel and Back and a reload land on it. With script, the yellow
 * strip slides from the old tab to the new one on the springy ease. Under
 * reduced motion it simply moves.
 */
export function Tabs({ items, current, label, className }: TabsProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<Box | null>(null);

  React.useLayoutEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    const measure = () => {
      const on = row.querySelector<HTMLElement>('[aria-current="page"]');
      setBox(on === null ? null : { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [current]);

  return (
    <nav aria-label={label} className={cn('font-sans', className)}>
      <div ref={rowRef} className="relative flex gap-ds-2 overflow-x-auto pb-ds-2 -mb-ds-2">
        {box !== null && (
          <span
            aria-hidden="true"
            className="absolute rounded-full bg-signal shadow-sm transition-all duration-(--dur) ease-magnet motion-reduce:transition-none"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          />
        )}
        {items.map((t) => {
          const on = t.id === current;
          return (
            <Link
              key={t.id}
              // Built at run time from a known page and a query, which typed
              // routes cannot infer.
              href={t.href as Route}
              scroll={false}
              aria-current={on ? 'page' : undefined}
              className={cn(
                // globals.css underlines every <a>; a tab is a strip.
                'relative inline-flex items-center shrink-0 min-h-[44px] px-ds-4 rounded-full border-2 no-underline',
                'text-sm font-semibold whitespace-nowrap transition-colors duration-(--dur)',
                on
                  ? cn('border-signal text-signal-foreground hover:text-signal-foreground', box === null && 'bg-signal')
                  : 'border-border-strong text-foreground hover:border-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
