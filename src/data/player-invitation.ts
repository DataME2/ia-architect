/**
 * A registrar inviting a player to their own workspace (scope 64, BR150).
 *
 * `family.ts`'s shape, moved from a guardian to the player themselves: the
 * database enforces BR150 (thirteen or over, own registration COMPLETE),
 * so this file does not re-check it, only reads the status and records the
 * attempt.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { QueryError } from './queries.ts';
import type { PlayerInvitationRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface PlayerInvitationStatus {
  readonly invitedAt: string | null;
  readonly claimedAt: string | null;
}

/** Any existing invitation for this player, at this club. */
export async function loadPlayerInvitationStatus(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<PlayerInvitationStatus | null> {
  const rows = unwrap<PlayerInvitationRow[]>(
    'player_invitation',
    await client.from('player_invitation').select('*').eq('club_id', clubId).eq('person_id', personId).limit(1),
  );
  const row = rows[0];
  if (row === undefined) return null;
  return { invitedAt: row.invited_at, claimedAt: row.claimed_at };
}

/**
 * Record the invitation. BR150 is the database's job — an incomplete
 * registration or an under-thirteen player refuses this with a message
 * naming the rule, translated below into something a registrar reads
 * without opening the schema.
 */
export async function recordPlayerInvitation(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  email: string,
  invitedByUserId: string,
): Promise<{ readonly alreadyInvited: boolean } | { readonly error: string }> {
  const { error } = await client.from('player_invitation').insert({
    club_id: clubId,
    person_id: personId,
    email,
    invited_by_user_id: invitedByUserId,
  });

  if (error === null) return { alreadyInvited: false };

  // A second attempt is a resend, not a failure — the same courtesy
  // recordGuardianInvitation extends.
  if (error.message.includes('duplicate key')) return { alreadyInvited: true };

  if (error.message.includes('thirteen')) {
    return { error: 'This player is not yet thirteen — BR63 sets that as the floor for their own account.' };
  }
  if (error.message.includes('BR150')) {
    return { error: 'This registration is not yet COMPLETE — invite once it is finished.' };
  }

  return { error: error.message };
}
