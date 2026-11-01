/**
 * The finance report's two reads (scope 133, migration 0102).
 *
 * Both are `security definer` functions that check the caller's role first
 * (BR142), so a refusal arrives as an error and is turned into a `Report`
 * of kind `refused`, as `reporting.ts` does: a committee member is told the
 * bills are not theirs to see, never shown an empty list that reads as
 * "nobody owes anything".
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Report } from '../domain/reporting/types.ts';
import { BILLS_PER_PAGE, type BillsPage, type FinanceReport } from '../web/finance-report.ts';

function refused<T>(message: string): Report<T> {
  return {
    kind: 'refused',
    because: message.includes('BR142')
      ? message.replace(/\s*\(BR[^)]*\)\s*$/, '.')
      : `This could not be produced: ${message.replace(/^.*?:\s*/, '')}`,
  };
}

export async function loadFinanceReport(client: SupabaseClient, clubId: string): Promise<Report<FinanceReport>> {
  const { data, error } = await client.rpc('app_finance_report', { p_club_id: clubId });
  if (error !== null) return refused(error.message);
  const report = data as FinanceReport;
  return { kind: 'ready', figures: report, computedAt: report.computedAt };
}

export interface BillFilters {
  readonly team: string | null;
  readonly owing: boolean;
  readonly search: string | null;
  readonly page: number;
}

export async function loadFinanceBills(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  filters: BillFilters,
): Promise<Report<BillsPage>> {
  const { data, error } = await client.rpc('app_finance_bills', {
    p_club_id: clubId,
    p_season_id: seasonId,
    p_team: filters.team,
    p_owing: filters.owing,
    p_search: filters.search,
    p_limit: BILLS_PER_PAGE,
    p_offset: (filters.page - 1) * BILLS_PER_PAGE,
  });
  if (error !== null) return refused(error.message);
  return { kind: 'ready', figures: data as BillsPage, computedAt: new Date().toISOString() };
}
