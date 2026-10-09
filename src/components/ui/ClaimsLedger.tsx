import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill } from './StatusPill.tsx';

/**
 * What an official is owed, claim by claim (scope 90): the match, the fee,
 * where it stands, and the payout reference once paid (`SIM-…` while
 * payouts are simulated). Presentational: lines come from
 * `src/web/referee-board.ts`.
 */
export interface ClaimsLedgerLine {
  readonly id: string;
  readonly match: string;
  readonly playedOn: string;
  readonly amount: string;
  readonly status: 'pending' | 'approved' | 'batched' | 'paid' | 'rejected';
  readonly label: string;
  readonly reference: string | null;
}

const VARIANT: Record<ClaimsLedgerLine['status'], 'pending' | 'info' | 'cleared' | 'blocked'> = {
  pending: 'pending',
  approved: 'info',
  batched: 'info',
  paid: 'cleared',
  rejected: 'blocked',
};

export function ClaimsLedger({
  lines,
  owed,
  paid,
  className,
}: {
  readonly lines: readonly ClaimsLedgerLine[];
  readonly owed: string;
  readonly paid: string;
  readonly className?: string;
}) {
  return (
    <div className={cn('font-sans', className)}>
      <dl className="m-0 mb-ds-3 grid grid-cols-2 gap-ds-2">
        <div className="p-ds-3 rounded-sm bg-warning text-warning-foreground">
          <dt className="font-mono text-[11px] uppercase tracking-wider">Still owed</dt>
          <dd className="m-0 text-lg font-bold tabular-nums">{owed}</dd>
        </div>
        <div className="p-ds-3 rounded-sm bg-success text-success-foreground">
          <dt className="font-mono text-[11px] uppercase tracking-wider">Paid</dt>
          <dd className="m-0 text-lg font-bold tabular-nums">{paid}</dd>
        </div>
      </dl>
      {lines.length === 0 ? (
        <p className="m-0 text-sm text-muted">No claims yet. The coordinator raises one after a match is verified.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Your match fees and where each stands</caption>
            <thead>
              <tr className="text-left">
                <th scope="col" className="font-mono text-[11px] uppercase tracking-wider text-muted py-ds-1 pr-ds-2">Match</th>
                <th scope="col" className="font-mono text-[11px] uppercase tracking-wider text-muted py-ds-1 pr-ds-2">Date</th>
                <th scope="col" className="font-mono text-[11px] uppercase tracking-wider text-muted py-ds-1 pr-ds-2 text-right">Fee</th>
                <th scope="col" className="font-mono text-[11px] uppercase tracking-wider text-muted py-ds-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-ds-2 pr-ds-2 font-semibold text-foreground">{l.match}</td>
                  <td className="py-ds-2 pr-ds-2 font-mono text-xs text-muted whitespace-nowrap">{l.playedOn}</td>
                  <td className="py-ds-2 pr-ds-2 text-right tabular-nums">{l.amount}</td>
                  <td className="py-ds-2">
                    <StatusPill variant={VARIANT[l.status]} size="sm" label={l.label} />
                    {l.reference !== null && <span className="block mt-0.5 font-mono text-[11px] text-muted">{l.reference}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
