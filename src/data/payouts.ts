/**
 * Where an official is paid, and the online payout of a batch (scope 76;
 * BR161, BR162). Every refusal that matters is the database's (0072): who
 * may nominate, the shape of a nomination, and the all-or-nothing payout.
 *
 * The payout is **simulated**: `app_simulate_batch_payout` records what a
 * provider would have done and moves no money. docs/annexes/payout-providers.md
 * says what replaces it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { maskNomination, type NominationInput, type PayoutMethod } from '../web/payout-nomination.ts';

/** Each official's live nomination, masked, for the people the caller may see. */
export async function loadNominations(
  client: SupabaseClient,
  clubId: string,
  personIds: readonly string[],
): Promise<ReadonlyMap<string, string>> {
  if (personIds.length === 0) return new Map();
  const { data } = await client
    .from('payout_nomination')
    .select('person_id, method, bsb, account_number, paypal_email, stripe_account_id')
    .eq('club_id', clubId)
    .in('person_id', personIds)
    .is('superseded_at', null);
  return new Map(
    ((data ?? []) as { person_id: string; method: PayoutMethod }[]).map((n) => [n.person_id, maskNomination(n)]),
  );
}

/** Record where an official is to be paid; the previous one is superseded. */
export async function nominatePayout(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  nominatedByPersonId: string,
  input: NominationInput,
): Promise<string | null> {
  const { error } = await client.from('payout_nomination').insert({
    club_id: clubId,
    person_id: personId,
    nominated_by_person_id: nominatedByPersonId,
    method: input.method,
    account_name: input.method === 'bank_transfer' ? input.accountName : null,
    bsb: input.method === 'bank_transfer' ? input.bsb : null,
    account_number: input.method === 'bank_transfer' ? input.accountNumber : null,
    paypal_email: input.method === 'paypal' ? input.paypalEmail : null,
    stripe_account_id: input.method === 'stripe' ? input.stripeAccountId : null,
  });
  if (error === null) return null;
  return error.code === '42501'
    ? 'Only the official from eighteen, or their Parent/Guardian before, nominates where they are paid (BR161).'
    : error.message;
}

/** The treasurer's "Pay online" for a closed run — simulated (BR162). */
export async function simulateBatchPayout(
  client: SupabaseClient,
  batchId: string,
): Promise<{ readonly paid: number } | { readonly error: string }> {
  const { data, error } = await client.rpc('app_simulate_batch_payout', { p_batch_id: batchId });
  return error === null ? { paid: Number(data) } : { error: error.message };
}

/** The payout recorded for each claim, if any. */
export async function loadPayouts(
  client: SupabaseClient,
  claimIds: readonly string[],
): Promise<ReadonlyMap<string, { readonly reference: string; readonly simulated: boolean }>> {
  if (claimIds.length === 0) return new Map();
  const { data } = await client
    .from('referee_payout')
    .select('claim_id, provider_reference, provider')
    .in('claim_id', claimIds);
  return new Map(
    ((data ?? []) as { claim_id: string; provider_reference: string; provider: string }[]).map((p) => [
      p.claim_id,
      { reference: p.provider_reference, simulated: p.provider === 'simulation' },
    ]),
  );
}
