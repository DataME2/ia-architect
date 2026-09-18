/**
 * A player's own claim about their record, and its review (BR148, scope 63).
 *
 * `player_record_correction` is a claim, never a direct write to
 * `person`/`player_profile` — the same shape `officiating.ts`'s
 * `officiating_interest` functions already use. Nothing here writes the
 * real record; only `app_review_player_record_correction()` does that, and
 * only on confirm.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { PlayerRecordCorrectionRow } from './schema.ts';

export interface ProposedFields {
  readonly preferredName?: string;
  readonly email?: string;
  readonly preferredPosition?: string;
  readonly secondaryPosition?: string;
  readonly preferredFoot?: string;
  readonly squadNumber?: number;
}

export interface PlayerCorrection {
  readonly id: string;
  readonly personId: string;
  readonly registrationId: string;
  readonly proposedAt: string;
  readonly fields: ProposedFields;
  readonly state: PlayerRecordCorrectionRow['state'];
  readonly reviewedAt: string | null;
  readonly reviewNote: string | null;
}

function toFields(row: PlayerRecordCorrectionRow): ProposedFields {
  return {
    ...(row.preferred_name !== null && { preferredName: row.preferred_name }),
    ...(row.email !== null && { email: row.email }),
    ...(row.preferred_position !== null && { preferredPosition: row.preferred_position }),
    ...(row.secondary_position !== null && { secondaryPosition: row.secondary_position }),
    ...(row.preferred_foot !== null && { preferredFoot: row.preferred_foot }),
    ...(row.squad_number !== null && { squadNumber: row.squad_number }),
  };
}

/** The player's own claim for their current registration, whatever its state. */
export async function loadMyCorrection(
  client: SupabaseClient,
  registrationId: string,
): Promise<PlayerCorrection | null> {
  const { data } = await client
    .from('player_record_correction')
    .select('*')
    .eq('registration_id', registrationId)
    .order('proposed_at', { ascending: false })
    .limit(1);

  const row = ((data ?? []) as PlayerRecordCorrectionRow[])[0];
  if (row === undefined) return null;

  return {
    id: row.id,
    personId: row.person_id,
    registrationId: row.registration_id,
    proposedAt: row.proposed_at,
    fields: toFields(row),
    state: row.state,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

/** Every pending claim for one registration — at most one, by BR148's own constraint. */
export async function loadPendingCorrection(
  client: SupabaseClient,
  registrationId: string,
): Promise<PlayerCorrection | null> {
  const { data } = await client
    .from('player_record_correction')
    .select('*')
    .eq('registration_id', registrationId)
    .eq('state', 'pending')
    .limit(1);

  const row = ((data ?? []) as PlayerRecordCorrectionRow[])[0];
  if (row === undefined) return null;

  return {
    id: row.id,
    personId: row.person_id,
    registrationId: row.registration_id,
    proposedAt: row.proposed_at,
    fields: toFields(row),
    state: row.state,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
  };
}

/**
 * Records the claim. `personId` and `proposedByUserId` are the caller's
 * own — resolved by the action from `loadMe`, never taken from a form
 * field, the same discipline `answerDesignationAction` uses for BR113.
 */
export async function proposeCorrection(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  personId: string,
  proposedByUserId: string,
  fields: ProposedFields,
): Promise<string | null> {
  const { error } = await client.from('player_record_correction').insert({
    club_id: clubId,
    registration_id: registrationId,
    person_id: personId,
    proposed_by_user_id: proposedByUserId,
    preferred_name: fields.preferredName ?? null,
    email: fields.email ?? null,
    preferred_position: fields.preferredPosition ?? null,
    secondary_position: fields.secondaryPosition ?? null,
    preferred_foot: fields.preferredFoot ?? null,
    squad_number: fields.squadNumber ?? null,
  });
  if (error === null) return null;

  if (error.message.includes('player_record_correction_pending_idx')) {
    return 'You already have a correction waiting on a decision.';
  }
  if (error.message.includes('BR148')) {
    return 'Only a player of eighteen or over may propose a correction to their own record.';
  }
  if (error.message.includes('player_record_correction_proposes_something')) {
    return 'Nothing was changed.';
  }
  return error.message;
}

export type ReviewOutcome = 'confirmed' | 'declined';

export async function reviewCorrection(
  client: SupabaseClient,
  correctionId: string,
  accept: boolean,
  note: string | null,
): Promise<{ outcome: ReviewOutcome } | { error: string }> {
  const { data, error } = await client.rpc('app_review_player_record_correction', {
    p_correction_id: correctionId,
    p_accept: accept,
    p_note: note,
  });
  if (error !== null) return { error: error.message.replace(/^.*?:\s*/, '') };
  return { outcome: (data as ReviewOutcome | null) ?? 'confirmed' };
}
