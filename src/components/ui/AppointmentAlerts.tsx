import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill } from './StatusPill.tsx';

/**
 * The conflict and card check beside an official's appointments (scope 90):
 * each upcoming match with a red, amber or green status and the reasons,
 * each naming its rule. Presentational: the alerts are decided in
 * `src/web/referee-board.ts`.
 */
export interface AppointmentAlertItem {
  readonly id: string;
  readonly title: string;
  /** "Sat 11 Oct · 09:00 · Referee · offered" */
  readonly when: string;
  readonly tone: 'clear' | 'check' | 'blocked';
  readonly reasons: readonly { readonly rule: string; readonly text: string; readonly tone: 'check' | 'blocked' }[];
}

const TONE: Record<AppointmentAlertItem['tone'], { variant: 'cleared' | 'pending' | 'blocked'; label: string; bar: string }> = {
  clear: { variant: 'cleared', label: 'Clear', bar: 'border-l-success-indicator' },
  check: { variant: 'pending', label: 'Check', bar: 'border-l-warning-indicator' },
  blocked: { variant: 'blocked', label: 'Blocked', bar: 'border-l-destructive-indicator' },
};

export function AppointmentAlerts({ items, className }: { readonly items: readonly AppointmentAlertItem[]; readonly className?: string }) {
  const counts = {
    blocked: items.filter((i) => i.tone === 'blocked').length,
    check: items.filter((i) => i.tone === 'check').length,
    clear: items.filter((i) => i.tone === 'clear').length,
  };
  return (
    <div className={cn('font-sans', className)}>
      {items.length === 0 ? (
        <p className="m-0 text-sm text-muted">No upcoming appointment to check.</p>
      ) : (
        <>
          <p className="m-0 mb-ds-3 flex flex-wrap gap-ds-2" aria-label="Summary">
            {counts.blocked > 0 && <StatusPill variant="blocked" size="sm" label={`${counts.blocked} blocked`} />}
            {counts.check > 0 && <StatusPill variant="pending" size="sm" label={`${counts.check} to check`} />}
            {counts.clear > 0 && <StatusPill variant="cleared" size="sm" label={`${counts.clear} clear`} />}
          </p>
          <ul className="m-0 p-0 list-none flex flex-col gap-ds-2">
            {items.map((item) => {
              const t = TONE[item.tone];
              return (
                <li key={item.id} className={cn('p-ds-3 rounded-sm border border-border bg-surface border-l-4', t.bar)}>
                  <div className="flex items-start justify-between gap-ds-2">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                      <span className="block font-mono text-[11px] uppercase tracking-wider text-muted">{item.when}</span>
                    </span>
                    <StatusPill variant={t.variant} size="sm" label={t.label} />
                  </div>
                  {item.reasons.length > 0 && (
                    <ul className="m-0 mt-ds-2 pl-ds-4 text-xs text-muted-foreground flex flex-col gap-0.5">
                      {item.reasons.map((r) => (
                        <li key={r.rule + r.text}>
                          <span className={cn('font-semibold', r.tone === 'blocked' ? 'text-destructive-foreground' : 'text-warning-foreground')}>
                            {r.tone === 'blocked' ? 'Blocked' : 'Check'}:
                          </span>{' '}
                          {r.text} <span className="font-mono text-[10px]">{r.rule}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
