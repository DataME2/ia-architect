/**
 * BR50's nightly half: withdrawing the holder of a lapsed Working with
 * Children Check from every future assignment.
 *
 * Thin, because the rule lives in the database. `app_withdraw_lapsed_clearances`
 * decides what a lapse means and what counts as future, and the **same
 * function** is called by the revocation trigger — so the immediate path and
 * the nightly path cannot come to disagree. A second definition here would
 * drift, and it would drift on the safeguarding side.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';

export interface WithdrawalResult {
  readonly clubId: string;
  readonly clubName: string;
  /** Assignments withdrawn by this run. Zero on most nights, by design. */
  readonly withdrawn: number;
}

export async function withdrawLapsedClearances(
  client: SupabaseClient,
  clubId: string,
  clubName: string,
): Promise<WithdrawalResult> {
  const { data, error } = await client.rpc('app_withdraw_lapsed_clearances', {
    p_club_id: clubId,
  });
  if (error !== null) throw new QueryError('app_withdraw_lapsed_clearances', error.message);

  return { clubId, clubName, withdrawn: Number(data ?? 0) };
}
