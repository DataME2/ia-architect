'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Signal's acting-as chip (scope 93): names the lens a person is looking
 * through, wherever they are.
 *
 * It mirrors the identity rail and never replaces it (DESIGN.md Principle
 * 3). Its menu holds plain links: on `/me` they are the rail's own role
 * URLs, so switching stays explicit and a URL (BR61); on club screens,
 * where every club role applies at once, it links to `/me` instead of
 * switching anything.
 */
export interface ActingAsLink {
  readonly href: string;
  readonly label: string;
  readonly hint?: string;
  readonly current?: boolean;
}

export interface ActingAsProps {
  /** "Coach", or "Registrar and Treasurer" on a club screen. */
  readonly lens: string;
  /** Club or organisation the lens applies at. */
  readonly place: string | null;
  /** The role's colour on the rail, decoration only. Never the Assistant's teal. */
  readonly hue?: string;
  /** A short qualifier: "your only role, so nothing was switched". */
  readonly note?: string | null;
  readonly links: readonly ActingAsLink[];
  readonly menuLabel?: string;
  readonly className?: string;
}

export function ActingAs({ lens, place, hue, note, links, menuLabel = 'Switch lens', className }: ActingAsProps) {
  const [open, setOpen] = React.useState(false);
  const menuId = React.useId();
  const wrap = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={wrap} className={cn('relative inline-flex flex-wrap items-center gap-ds-2 font-sans', className)}>
      <p className="m-0 inline-flex flex-wrap items-center gap-ds-2 text-sm text-foreground">
        <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: hue ?? 'var(--color-primary)' }} />
        <span>You are acting as <b>{lens}</b>{place && <span className="text-muted"> · {place}</span>}</span>
        {note && <span className="text-xs text-muted">({note})</span>}
      </p>
      {links.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-ds-1.5 min-h-[44px] px-ds-3 rounded-full border border-border-strong bg-surface text-foreground text-xs font-semibold shadow-none hover:bg-surfaceSubtle! hover:text-foreground! focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {menuLabel}
          <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={open ? 'M5 12l5-5 5 5' : 'M5 8l5 5 5-5'} /></svg>
        </button>
      )}
      {open && (
        <ul id={menuId} className="absolute left-0 top-full z-50 mt-ds-2 w-72 max-w-[calc(100vw-32px)] list-none m-0 p-ds-1.5 rounded-DEFAULT border border-border bg-surface shadow-md">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                aria-current={l.current ? 'page' : undefined}
                className={cn('flex flex-col min-h-[44px] justify-center px-ds-3 py-ds-1.5 rounded-sm no-underline text-sm text-foreground!', l.current ? 'bg-primary-soft font-semibold' : 'hover:bg-surfaceSubtle')}
              >
                {l.label}
                {l.hint && <span className="text-xs text-muted font-normal">{l.hint}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
