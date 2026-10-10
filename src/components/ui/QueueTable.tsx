import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A titled table of registrations (Figma "Registrar season queue", 33:2777):
 * a white card, a mono header row on a sunken band, mono cells. Server-safe:
 * cells arrive as rendered content, not accessor functions.
 */
export interface QueueTableProps {
  readonly title: string;
  readonly subtitle?: React.ReactNode;
  readonly columns: readonly string[];
  readonly rows: readonly { readonly key: string; readonly cells: readonly React.ReactNode[] }[];
  readonly empty: string;
  readonly footnote?: React.ReactNode;
  readonly id?: string;
  readonly className?: string;
}

export function QueueTable({ title, subtitle, columns, rows, empty, footnote, id, className }: QueueTableProps) {
  return (
    <section id={id} className={cn('font-sans flex flex-col gap-ds-4 p-ds-5 rounded-md border border-border bg-surface', className)}>
      <div>
        <h3 className="m-0 text-xl font-medium text-foreground">
          {title} <span className="text-muted font-normal">({rows.length})</span>
        </h3>
        {subtitle !== undefined && <p className="m-0 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-backgroundSunk text-left">
                {columns.map((c) => (
                  <th key={c} scope="col" className="py-ds-3 px-ds-2 font-medium text-muted">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="align-top text-foreground">
                  {r.cells.map((cell, i) => (
                    <td key={columns[i] ?? i} className="py-ds-3 px-ds-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footnote !== undefined && <p className="m-0 text-xs text-muted-foreground">{footnote}</p>}
    </section>
  );
}

/** A dot and a word: no state by colour alone (DESIGN.md Principle 1). */
export function Marker({ tone, children }: { readonly tone: 'ok' | 'pending' | 'stop' | 'neutral'; readonly children: React.ReactNode }) {
  const dot = {
    ok: 'bg-success-indicator',
    pending: 'bg-warning-indicator',
    stop: 'bg-destructive-indicator',
    neutral: 'bg-muted-foreground',
  }[tone];
  return (
    <span className="inline-flex items-baseline gap-ds-1.5">
      <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full shrink-0 translate-y-[-1px]', dot)} />
      {children}
    </span>
  );
}

const ICONS = {
  people: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7',
  coins: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
} as const;

const CHIP = {
  ok: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  stop: 'bg-destructive text-destructive-foreground',
  neutral: 'bg-secondary text-muted-foreground',
} as const;

/**
 * A metric tile (Figma 2002:461): an icon tile, a status chip in words (never a
 * colour alone), the label and the figure. The chip states a fact; no
 * invented trend percentages.
 */
export function MetricTile({
  icon,
  label,
  value,
  chip,
}: {
  readonly icon: keyof typeof ICONS;
  readonly label: string;
  readonly value: string;
  readonly chip?: { readonly tone: keyof typeof CHIP; readonly text: string };
}) {
  return (
    <div className="font-sans flex flex-col gap-ds-3 p-ds-5 rounded-lg border border-border bg-surface shadow-xs">
      <div className="flex items-start justify-between gap-ds-2">
        <span aria-hidden="true" className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary-soft text-primary">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={ICONS[icon]} />
          </svg>
        </span>
        {chip !== undefined && (
          <span className={cn('px-ds-2 py-0.5 rounded-full text-[11px] font-semibold', CHIP[chip.tone])}>{chip.text}</span>
        )}
      </div>
      <div>
        <p className="m-0 text-sm text-muted-foreground">{label}</p>
        <p className="m-0 text-2xl font-bold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/** Initials in a violet circle, beside a name (Figma 2002:461's member avatars). */
export function NameWithAvatar({ name, detail, href }: { readonly name: string; readonly detail?: string; readonly href: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  return (
    <span className="flex items-center gap-ds-3 font-sans">
      <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-soft text-primary text-xs font-bold">
        {letters}
      </span>
      <span className="min-w-0">
        <a className="block text-sm font-semibold text-foreground no-underline hover:underline" href={href}>
          {name}
        </a>
        {detail !== undefined && <span className="block text-xs text-muted-foreground truncate">{detail}</span>}
      </span>
    </span>
  );
}
