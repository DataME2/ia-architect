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
