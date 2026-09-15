import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppointedBy, FeeRate, OfficialRole } from '../domain/officiating/fees.ts';
import type { ScheduleRow } from '../web/fee-schedule-form.ts';

/**
 * A club's own match-official rate table (BR115, BR116).
 *
 * The schema and the resolution have existed since migration 0026; what had
 * never existed is a way to author a schedule. So every club had none, every
 * `rateFor` returned `none`, and **no official could be paid at all** —
 * scope 34's WP2, and the reason the referee finance service has been
 * Partial since it was written.
 *
 * **Reads are wider than writes, and that is 0026's policies, not this
 * file's.** A coordinator sees what a game pays before designating somebody;
 * only an admin or treasurer sets it, because the club's Committee decides
 * rates and the treasurer keeps them (scope 34's question #1).
 */

export interface StoredRate extends FeeRate {
  readonly id: string;
}

export async function loadSchedules(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly ScheduleRow[]> {
  const [{ data: schedules }, { data: rates }] = await Promise.all([
    client.from('referee_fee_schedule').select('id, effective_from, note')
      .eq('club_id', clubId).order('effective_from', { ascending: false }),
    client.from('referee_fee_rate').select('schedule_id').eq('club_id', clubId),
  ]);

  const counts = new Map<string, number>();
  for (const r of rates ?? []) {
    const key = r.schedule_id as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (schedules ?? []).map((s) => ({
    id: s.id as string,
    effectiveFrom: s.effective_from as string,
    note: (s.note as string | null) ?? null,
    // Counted rather than left to the screen to infer from an empty list:
    // "3 rates" on a schedule a club is about to supersede is the single
    // most useful thing on the page.
    rateCount: counts.get(s.id as string) ?? 0,
  }));
}

export async function loadRates(
  client: SupabaseClient,
  clubId: string,
  scheduleId: string,
): Promise<readonly StoredRate[]> {
  const { data } = await client
    .from('referee_fee_rate')
    .select('id, role, competition, classification, appointed_by, amount_cents')
    .eq('club_id', clubId)
    .eq('schedule_id', scheduleId)
    .order('role', { ascending: true })
    .order('amount_cents', { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id as string,
    role: r.role as OfficialRole,
    competition: (r.competition as string | null) ?? null,
    classification: (r.classification as string | null) ?? null,
    appointedBy: (r.appointed_by as AppointedBy | null) ?? null,
    amountCents: Number(r.amount_cents),
  }));
}

export async function createSchedule(
  client: SupabaseClient,
  clubId: string,
  effectiveFrom: string,
  note: string | null,
  publishedBy: string,
): Promise<{ readonly id: string } | { readonly error: string }> {
  const { data, error } = await client
    .from('referee_fee_schedule')
    .insert({ club_id: clubId, effective_from: effectiveFrom, note, published_by: publishedBy })
    .select('id')
    .single();

  if (error !== null) {
    // 0026's `unique (club_id, effective_from)`: a second schedule starting
    // the same day is a second answer to what the club paid from that day.
    return {
      error: error.code === '23505'
        ? `This club already has a schedule starting ${effectiveFrom}. A schedule is a dated version (BR115) — choose a different start date, or supersede that one.`
        : error.message.replace(/^.*?:\s*/, ''),
    };
  }
  return { id: data.id as string };
}

/**
 * Start a new schedule from an existing one's rates.
 *
 * The ordinary act: a club's rates change by a few dollars at the AGM, and
 * BR115 says that is a **new dated version** rather than an edit. Retyping
 * twelve cells to change two is how a club ends up editing the old schedule
 * instead, which is the thing the rule exists to prevent — so the editor
 * makes the compliant path the easy one.
 */
export async function copyRatesInto(
  client: SupabaseClient,
  clubId: string,
  fromScheduleId: string,
  intoScheduleId: string,
): Promise<number> {
  const rates = await loadRates(client, clubId, fromScheduleId);
  if (rates.length === 0) return 0;

  const { error } = await client.from('referee_fee_rate').insert(
    rates.map((r) => ({
      club_id: clubId,
      schedule_id: intoScheduleId,
      role: r.role,
      competition: r.competition,
      classification: r.classification,
      appointed_by: r.appointedBy,
      amount_cents: r.amountCents,
    })),
  );

  return error === null ? rates.length : 0;
}

export async function addRate(
  client: SupabaseClient,
  clubId: string,
  scheduleId: string,
  rate: FeeRate,
): Promise<string | null> {
  const { error } = await client.from('referee_fee_rate').insert({
    club_id: clubId,
    schedule_id: scheduleId,
    role: rate.role,
    competition: rate.competition,
    classification: rate.classification,
    appointed_by: rate.appointedBy,
    amount_cents: rate.amountCents,
  });

  if (error === null) return null;
  return error.code === '23505'
    ? 'That cell is already defined in this schedule — one cell, one rate.'
    : error.message.replace(/^.*?:\s*/, '');
}

export async function removeRate(
  client: SupabaseClient,
  clubId: string,
  rateId: string,
): Promise<string | null> {
  const { error } = await client
    .from('referee_fee_rate')
    .delete()
    .eq('club_id', clubId)
    .eq('id', rateId);

  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}
