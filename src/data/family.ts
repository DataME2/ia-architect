/**
 * A registrar inviting a guardian to their own workspace (scope 35, WP4).
 *
 * The database enforces BR126 — refusing the insert unless a child under
 * that guardian's authority already has a registration at COMPLETE — so
 * this file does not re-check it; it only reads the candidates and their
 * invitation status, and records the attempt. The magic link itself is
 * sent from the server action, on the anon key, the same way `/platform`
 * already invites a club's responsible people.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { displayNameFor } from '../web/queue-view.ts';
import { toPerson } from './mappers.ts';
import { QueryError } from './queries.ts';
import type { GuardianInvitationRow, GuardianshipRow, PersonRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface GuardianCandidate {
  readonly personId: string;
  readonly name: string;
  readonly email: string | null;
  readonly invitedAt: string | null;
  readonly claimedAt: string | null;
}

/** Every authoritative guardian of one child, with any existing invitation. */
export async function loadGuardianCandidates(
  client: SupabaseClient,
  clubId: string,
  childPersonId: string,
): Promise<readonly GuardianCandidate[]> {
  const guardianships = unwrap<GuardianshipRow[]>(
    'guardianship',
    await client
      .from('guardianship')
      .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', clubId)
      .eq('person_id', childPersonId)
      .eq('is_authority', true),
  );
  if (guardianships.length === 0) return [];

  const ids = guardianships.map((g) => g.guardian_person_id);
  const people = unwrap<PersonRow[]>(
    'person',
    await client.from('person').select('*').eq('club_id', clubId).in('id', ids),
  );
  const invites = unwrap<GuardianInvitationRow[]>(
    'guardian_invitation',
    await client.from('guardian_invitation').select('*').eq('club_id', clubId).in('guardian_person_id', ids),
  );

  return people.map((p) => {
    const invite = invites.find((i) => i.guardian_person_id === p.id) ?? null;
    return {
      personId: p.id,
      name: displayNameFor(toPerson(p)),
      email: p.email,
      invitedAt: invite?.invited_at ?? null,
      claimedAt: invite?.claimed_at ?? null,
    };
  });
}

/**
 * Record the invitation. BR126 is the database's job — a DRAFT registration
 * refuses this with a message naming the rule, translated below into
 * something a registrar reads without opening the schema.
 */
export async function recordGuardianInvitation(
  client: SupabaseClient,
  clubId: string,
  guardianPersonId: string,
  email: string,
  invitedByUserId: string,
): Promise<{ readonly alreadyInvited: boolean } | { readonly error: string }> {
  const { error } = await client.from('guardian_invitation').insert({
    club_id: clubId,
    guardian_person_id: guardianPersonId,
    email,
    invited_by_user_id: invitedByUserId,
  });

  if (error === null) return { alreadyInvited: false };

  // Already recorded — the app treats a second attempt as a resend rather
  // than a failure, since sending the link again is exactly what somebody
  // clicking "Invite" a second time means.
  if (error.message.includes('duplicate key')) return { alreadyInvited: true };

  if (error.message.includes('BR126')) {
    return { error: 'This child is not yet COMPLETE — invite once their registration is finished.' };
  }

  return { error: error.message };
}
