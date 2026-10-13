'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Signal's command bar (scope 93): find a screen or a person from anywhere.
 *
 * It finds; it never answers or acts. Results come from a pure function
 * the caller passes (`src/web/command.ts`), each one a real page that
 * decides for itself who may see it. A combobox in the ARIA sense: `/` or
 * Ctrl/⌘+K focuses it, the arrow keys move, Enter goes, Escape closes.
 */
export interface CommandResult {
  readonly label: string;
  readonly href: string;
  readonly group: string;
}

export interface CommandBarProps {
  readonly results: (query: string) => readonly CommandResult[];
  readonly placeholder?: string;
  readonly className?: string;
}

export function CommandBar({ results, placeholder = 'Find a screen or a person', className }: CommandBarProps) {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const wrap = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();
  const list = open ? results(query) : [];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, []);

  const go = (r: CommandResult | undefined) => { if (r) window.location.assign(r.href); };

  return (
    <div ref={wrap} className={cn('relative w-full max-w-xl font-sans', className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">Find a screen or a person</label>
      <input
        ref={input}
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && list[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={query}
        placeholder={`${placeholder}   /`}
        onChange={(e) => { setQuery(e.currentTarget.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, Math.max(0, list.length - 1))); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
          else if (e.key === 'Enter') { e.preventDefault(); go(list[active]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
        className="w-full min-h-[44px] rounded-full! border border-border bg-surface px-ds-4 text-sm text-foreground shadow-xs placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />
      {open && list.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Places and people" className="absolute left-0 right-0 top-full z-50 mt-ds-2 max-h-[60vh] overflow-y-auto rounded-DEFAULT border border-border bg-surface p-ds-1.5 shadow-md list-none m-0">
          {list.map((r, i) => (
            <li key={`${r.group}-${r.href}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <a
                href={r.href}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  'flex items-center justify-between gap-ds-3 min-h-[44px] px-ds-3 rounded-sm text-sm no-underline text-foreground!',
                  i === active ? 'bg-primary-soft' : 'bg-transparent',
                )}
              >
                <span>{r.label}</span>
                <span className="text-xs text-muted">{r.group}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
