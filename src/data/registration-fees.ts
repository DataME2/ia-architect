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
      .select('id, kind, name, amount_cents, deposit_cents, min_age, max_age, admin_only, standard')
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
      standard: Boolean(r.standard),
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
    standard: line.standard,
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

/** A team this season, and the club line its players are charged (0100). */
export interface TeamLine {
  readonly teamId: string;
  readonly teamName: string;
  readonly ageGroup: string | null;
  readonly players: number;
  readonly feeLineId: string | null;
}

export async function loadTeamLines(client: SupabaseClient, clubId: string, seasonId: string): Promise<TeamLine[]> {
  const { data: teams } = await client
    .from('team')
    .select('id, name, age_group')
    .eq('club_id', clubId)
    .eq('season_id', seasonId)
    .order('name');
  const ids = ((teams ?? []) as { id: string }[]).map((t) => t.id);
  if (ids.length === 0) return [];
  const [{ data: maps }, { data: members }] = await Promise.all([
    client.from('team_fee_line').select('team_id, fee_line_id').in('team_id', ids),
    client.from('team_member').select('team_id').in('team_id', ids).eq('role', 'player'),
  ]);
  const line = new Map(((maps ?? []) as { team_id: string; fee_line_id: string }[]).map((m) => [m.team_id, m.fee_line_id]));
  const count = new Map<string, number>();
  for (const m of (members ?? []) as { team_id: string }[]) count.set(m.team_id, (count.get(m.team_id) ?? 0) + 1);
  return ((teams ?? []) as { id: string; name: string; age_group: string | null }[]).map((t) => ({
    teamId: t.id,
    teamName: t.name,
    ageGroup: t.age_group,
    players: count.get(t.id) ?? 0,
    feeLineId: line.get(t.id) ?? null,
  }));
}

/** Charges a team's players this line, or (null) their age's standard line. */
export async function saveTeamLine(
  client: SupabaseClient,
  clubId: string,
  teamId: string,
  feeLineId: string | null,
): Promise<Done> {
  const { error } =
    feeLineId === null
      ? await client.from('team_fee_line').delete().eq('club_id', clubId).eq('team_id', teamId)
      : await client
          .from('team_fee_line')
          .upsert({ club_id: clubId, team_id: teamId, fee_line_id: feeLineId, updated_at: new Date().toISOString() }, { onConflict: 'team_id' });
  return error === null ? { ok: true } : failed(error);
}

/** One registration this season: what it owes now, and what the schedule says it would. */
export interface RepriceRow {
  readonly registrationId: string;
  readonly personName: string;
  readonly status: string;
  readonly hasPlan: boolean;
  readonly paidCents: number;
  readonly owesCents: number;
  readonly lineName: string | null;
  readonly siblingIndex: number;
  readonly totalCents: number;
  readonly wouldOweCents: number;
}

export async function previewSeasonPrices(client: SupabaseClient, clubId: string, seasonId: string): Promise<RepriceRow[]> {
  const { data, error } = await client.rpc('app_preview_season_prices', { p_club_id: clubId, p_season_id: seasonId });
  if (error !== null || data === null) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    registrationId: String(r.registration_id),
    personName: String(r.person_name),
    status: String(r.status),
    hasPlan: Boolean(r.has_plan),
    paidCents: Number(r.paid_cents),
    owesCents: Number(r.owes_cents),
    lineName: r.line_name === null ? null : String(r.line_name),
    siblingIndex: Number(r.sibling_index),
    totalCents: Number(r.total_cents),
    wouldOweCents: Number(r.would_owe_cents),
  }));
}

/** Applies the preview; returns how many registrations changed. */
export async function repriceSeason(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  includeComplete: boolean,
): Promise<{ readonly changed: number } | { readonly error: string }> {
  const { data, error } = await client.rpc('app_reprice_season', {
    p_club_id: clubId,
    p_season_id: seasonId,
    p_include_complete: includeComplete,
  });
  if (error !== null) return failed(error) as { error: string };
  return { changed: Number(data) };
}
