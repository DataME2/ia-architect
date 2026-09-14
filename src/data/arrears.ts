/**
 * Outstanding balances across seasons (scope 48, WP1).
 *
 * BR40/BR79's debt-visibility clock, not the registration slice's own
 * per-season figure: `app_outstanding_balances` reaches across every
 * season within the last two years, which is why it is a `security
 * definer` function rather than a plain `select` — the same BR142 shape
 * `../domain/reporting` already established, so a coach is refused rather
 * than handed a confident zero.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ArrearsRow, Report } from '../domain/reporting/types.ts';

export type ArrearsAction = 'payment_requested' | 'amendment_recorded';

/** Every Person owing money from a season within BR79's two-year window. */
export async function outstandingBalances(
  client: SupabaseClient,
  clubId: string,
): Promise<Report<readonly ArrearsRow[]>> {
  const { data, error } = await client.rpc('app_outstanding_balances', { p_club_id: clubId });

  if (error !== null) {
    return {
      kind: 'refused',
      because: error.message.includes('BR142')
        ? 'This report is not readable by your role at this club.'
        : `This report could not be produced: ${error.message.replace(/^.*?:\s*/, '')}`,
    };
  }

  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  const figures = rows.map((r): ArrearsRow => ({
    personId: r.person_id as string,
    personName: r.person_name as string,
    seasonId: r.season_id as string,
    seasonName: r.season_name as string,
    seasonEndedOn: r.season_ended_on as string,
    outstandingCents: Number(r.outstanding_cents ?? 0),
    ageDays: Number(r.age_days ?? 0),
    lastAction: (r.last_action as ArrearsRow['lastAction']) ?? null,
    lastActionAt: (r.last_action_at as string | null) ?? null,
  }));

  // BR143: carried even when the list is empty — "nobody owes anything, as
  // at 09:14" and "the report failed silently" must never look the same.
  return { kind: 'ready', figures, computedAt: new Date().toISOString() };
}

/**
 * The Treasurer's recorded response to one Person's arrear for one season
 * — BR79: payment requested, or a documented, reasoned amendment, never a
 * silent write-off. `reason` is required by the database itself when
 * `action` is `'amendment_recorded'` (twice over: the function's own check,
 * and the table's check constraint underneath it) — this only relays
 * whatever Postgres refuses.
 */
export async function recordArrearsAction(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  seasonId: string,
  action: ArrearsAction,
  reason: string | null,
): Promise<void> {
  const { error } = await client.rpc('app_record_arrears_action', {
    p_club_id: clubId,
    p_person_id: personId,
    p_season_id: seasonId,
    p_action: action,
    p_reason: reason,
  });
  if (error !== null) throw new Error(error.message.replace(/^.*?:\s*/, ''));
}
