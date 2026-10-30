import type { SupabaseClient } from '@supabase/supabase-js';

import type { FeeLineInput } from '../web/registration-fee-form.ts';
import { DEFAULT_SIBLING_DISCOUNT_BPS, type FeeKind, type FeeLine } from '../web/registration-price.ts';

/**
 * The club's fee schedule (0099, scope 130): its lines for a season, the
 * sibling discount and the registration terms. Read under 0099's policies
 * (admin, registrar, treasurer) and written by the admin and the treasurer
 * only (BR196); a refusal from those policies is turned into a sentence.
 */
export interface RegistrationFees {
  readonly lines: readonly FeeLine[];
  readonly discountBps: number;
  /** Null until the club writes its terms. */
  readonly terms: { readonly body: string; readonly values: Readonly<Record<string, string>> } | null;
}

type Done = { readonly ok: true } | { readonly error: string };

function failed(error: { code?: string; message: string }): Done {
  return error.code === '42501'
    ? { error: 'Only the club’s admin and treasurer can change its fees (BR196).' }
    : { error: error.message };
}

export async function loadRegistrationFees(client: SupabaseClient, clubId: string, seasonId: string): Promise<RegistrationFees> {
  const [lines, settings, terms] = await Promise.all([
    client
      .from('fee_line')
      .select('id, kind, name, amount_cents, deposit_cents, min_age, max_age, admin_only')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .is('retired_at', null)
      .order('kind')
      .order('min_age', { ascending: true, nullsFirst: true })
      .order('name'),
    client.from('fee_settings').select('sibling_discount_bps').eq('club_id', clubId).maybeSingle(),
    client.from('registration_terms').select('body, placeholder_values').eq('club_id', clubId).maybeSingle(),
  ]);
  return {
    lines: ((lines.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      kind: String(r.kind) as FeeKind,
      name: String(r.name),
      amountCents: Number(r.amount_cents),
      depositCents: r.deposit_cents === null ? null : Number(r.deposit_cents),
      minAge: r.min_age === null ? null : Number(r.min_age),
      maxAge: r.max_age === null ? null : Number(r.max_age),
      adminOnly: Boolean(r.admin_only),
    })),
    discountBps:
      settings.data === null ? DEFAULT_SIBLING_DISCOUNT_BPS : Number((settings.data as { sibling_discount_bps: number }).sibling_discount_bps),
    terms:
      terms.data === null
        ? null
        : {
            body: String((terms.data as { body: string }).body),
            values: (terms.data as { placeholder_values: Record<string, string> }).placeholder_values ?? {},
          },
  };
}

export async function addFeeLine(client: SupabaseClient, clubId: string, seasonId: string, line: FeeLineInput): Promise<Done> {
  const { error } = await client.from('fee_line').insert({
    club_id: clubId,
    season_id: seasonId,
    kind: line.kind,
    name: line.name,
    amount_cents: line.amountCents,
    deposit_cents: line.depositCents,
    min_age: line.minAge,
    max_age: line.maxAge,
    admin_only: line.adminOnly,
  });
  return error === null ? { ok: true } : failed(error);
}

/** Retired, never deleted: a registration priced from it can still say what it was priced from. */
export async function retireFeeLine(client: SupabaseClient, clubId: string, id: string): Promise<Done> {
  const { data, error } = await client
    .from('fee_line')
    .update({ retired_at: new Date().toISOString() })
    .eq('club_id', clubId)
    .eq('id', id)
    .select('id');
  if (error !== null) return failed(error);
  // RLS answers an update it refuses with no rows, not an error.
  return (data ?? []).length === 0 ? { error: 'Only the club’s admin and treasurer can change its fees (BR196).' } : { ok: true };
}

export async function saveSiblingDiscount(client: SupabaseClient, clubId: string, bps: number): Promise<Done> {
  const { error } = await client
    .from('fee_settings')
    .upsert({ club_id: clubId, sibling_discount_bps: bps, updated_at: new Date().toISOString() }, { onConflict: 'club_id' });
  return error === null ? { ok: true } : failed(error);
}

export async function saveTerms(
  client: SupabaseClient,
  clubId: string,
  body: string,
  values: Readonly<Record<string, string>>,
): Promise<Done> {
  const { error } = await client
    .from('registration_terms')
    .upsert({ club_id: clubId, body, placeholder_values: values, updated_at: new Date().toISOString() }, { onConflict: 'club_id' });
  return error === null ? { ok: true } : failed(error);
}
