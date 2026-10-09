import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The Financial Gate (scope 91): may this player take the field, and the
 * money behind the answer. Presentational: the verdict and lines are decided
 * in `src/web/financial-gate.ts`. `children` carries the actions that apply
 * (for a treasurer, links to verify a voucher or record a receipt).
 */
export interface FinancialGatePanelProps {
  readonly mayPlay: boolean;
  readonly verdict: string;
  readonly reason: string;
  readonly lines: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: string;
    readonly note: string | null;
    readonly tone: 'ok' | 'pending' | 'blocked' | 'neutral';
  }[];
  readonly children?: React.ReactNode;
  readonly className?: string;
}

const TILE: Record<FinancialGatePanelProps['lines'][number]['tone'], { box: string; dot: string; word: string }> = {
  ok: { box: 'border-l-success-indicator', dot: 'bg-success-indicator', word: 'In order' },
  pending: { box: 'border-l-warning-indicator', dot: 'bg-warning-indicator', word: 'Waiting' },
  blocked: { box: 'border-l-destructive-indicator', dot: 'bg-destructive-indicator', word: 'Blocking' },
  neutral: { box: 'border-l-border-strong', dot: 'bg-muted-foreground', word: '' },
};

export function FinancialGatePanel({ mayPlay, verdict, reason, lines, children, className }: FinancialGatePanelProps) {
  return (
    <div className={cn('font-sans', className)}>
      <div
        className={cn(
          'flex items-start gap-ds-3 p-ds-4 rounded-md border border-l-4',
          mayPlay
            ? 'bg-success text-success-foreground border-success-indicator'
            : 'bg-destructive text-destructive-foreground border-destructive-indicator',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('mt-1.5 w-2.5 h-2.5 shrink-0 rounded-full', mayPlay ? 'bg-success-indicator' : 'bg-destructive-indicator')}
        />
        <span>
          <span className="block text-base font-bold">{verdict}</span>
          <span className="block text-sm">{reason}</span>
        </span>
      </div>

      {lines.length > 0 && (
        <dl className="m-0 mt-ds-3 grid gap-ds-2 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {lines.map((l) => {
            const t = TILE[l.tone];
            return (
              <div key={l.key} className={cn('p-ds-3 rounded-sm border border-border bg-surface border-l-4', t.box)}>
                <dt className="flex items-center justify-between gap-ds-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                  <span>{l.label}</span>
                  {t.word !== '' && (
                    <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                      <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />
                      {t.word}
                    </span>
                  )}
                </dt>
                <dd className="m-0 mt-ds-1">
                  <span className="block text-lg font-bold text-foreground tabular-nums">{l.value}</span>
                  {l.note !== null && <span className="block mt-0.5 text-xs text-muted-foreground">{l.note}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {children !== undefined && <div className="mt-ds-3 flex flex-wrap gap-ds-2">{children}</div>}
    </div>
  );
}
