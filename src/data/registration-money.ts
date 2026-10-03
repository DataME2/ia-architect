/**
 * A registration's money, as the caller may see it (scope 74; BR78, BR79).
 *
 * `registration.outstanding_amount_cents` is not selectable since 0070: the
 * figure reaches the money roles, a guardian with authority and an adult
 * about themself, through `app_registration_money()`, which decides per
 * row. Everyone else who may read the registration learns only whether
 * money is owed, which with the status is BR79's "clear to play".
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';
import type { RegistrationRow } from './schema.ts';

/** Every registration column a signed-in caller may select. */
export const REGISTRATION_COLUMNS = 'id, club_id, person_id, season_id, status, created_at';

export type RegistrationBaseRow = Omit<RegistrationRow, 'outstanding_amount_cents' | 'owes' | 'hardship_until'>;

/** The rows, each with its balance (or null: not the caller's to see) and whether it owes. */
export async function withMoney(
  client: SupabaseClient,
  rows: readonly RegistrationBaseRow[],
): Promise<RegistrationRow[]> {
  if (rows.length === 0) return [];
  const { data, error } = await client.rpc('app_registration_money', {
    p_registration_ids: rows.map((r) => r.id),
  });
  if (error !== null) throw new QueryError('app_registration_money', error.message);
  const byId = new Map(
    ((data ?? []) as {
      registration_id: string;
      outstanding_amount_cents: number | null;
      owes: boolean;
      hardship_until: string | null;
    }[])
      .map((m) => [m.registration_id, m]),
  );
  return rows.map((r) => {
    const m = byId.get(r.id);
    return {
      ...r,
      outstanding_amount_cents: m?.outstanding_amount_cents ?? null,
      owes: m?.owes ?? false,
      hardship_until: m?.hardship_until ?? null,
    };
  });
}
