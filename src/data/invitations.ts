/**
 * Registration invitations (BR72, BR73).
 *
 * Issuing and revoking run as the signed-in registrar, under RLS like every
 * other query. Redeeming runs as `anon` through one `security definer`
 * function — see
 * `docs/decisions/6_public-registration-through-a-scoped-function.md`.
 */
import { randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { expiryFrom, hashToken } from '../web/invitation-view.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { RegistrationInvitationRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

/**
 * 32 random bytes, base64url.
 *
 * Unguessable is the entire access control here — there is no second factor
 * behind the link — so this uses the CSPRNG, not `Math.random`, and is long
 * enough that guessing is not a strategy.
 */
export function mintToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface IssuedInvitation {
  readonly row: RegistrationInvitationRow;
  /**
   * The only time this value exists outside the family's browser.
   *
   * BR73: shown once and never stored. Not returned by any later read, and
   * deliberately not written to the audit detail either.
   */
  readonly token: string;
}

export async function issueInvitation(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  label: string,
  expiryDays: number,
  actorUserId: string,
): Promise<IssuedInvitation> {
  const token = mintToken();

  const row = unwrap<RegistrationInvitationRow>(
    'registration_invitation',
    await client
      .from('registration_invitation')
      .insert({
        club_id: clubId,
        season_id: seasonId,
        token_hash: hashToken(token),
        label,
        expires_at: expiryFrom(new Date(), expiryDays),
        created_by_user_id: actorUserId,
      })
      .select('*')
      .single<RegistrationInvitationRow>(),
  );

  await recordAudit(client, clubId, actorUserId, {
    action: 'registration_invitation_issued',
    entity: 'registration_invitation',
    entityId: row.id,
    // Label and expiry only. The token is not audit detail — an audit log
    // holding live credentials is a second copy of the thing BR73 says to
    // keep only as a hash.
    detail: { label, expiresAt: row.expires_at, seasonId },
  });

  return { row, token };
}

export async function loadInvitations(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly RegistrationInvitationRow[]> {
  return unwrap<RegistrationInvitationRow[]>(
    'registration_invitation',
    await client
      .from('registration_invitation')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .order('created_at', { ascending: false }),
  );
}

/** Revocation takes effect immediately — the next submission is refused. */
export async function revokeInvitation(
  client: SupabaseClient,
  clubId: string,
  invitationId: string,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('registration_invitation')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('club_id', clubId)
    .is('revoked_at', null);
  if (error !== null) throw new QueryError('registration_invitation', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'registration_invitation_revoked',
    entity: 'registration_invitation',
    entityId: invitationId,
    detail: {},
  });
}

export interface PublicSubmission {
  readonly legalGivenNames: string;
  readonly legalFamilyName: string;
  readonly preferredName: string | null;
  readonly dateOfBirth: string;
  readonly email: string | null;
  readonly guardianGivenNames: string | null;
  readonly guardianFamilyName: string | null;
  readonly guardianEmail: string | null;
  readonly consentPhotograph: boolean;
  readonly consentPublicity: boolean;
}

export type PublicSubmitResult =
  | { readonly ok: true; readonly registrationId: string }
  | { readonly ok: false; readonly reason: 'invitation-invalid' | 'rejected'; readonly detail: string };

/**
 * Redeem a token, as an anonymous caller.
 *
 * The tenant is not an argument: the function resolves it from the
 * invitation the token names, so there is nothing here a caller could set to
 * reach another club.
 */
export async function submitPublicRegistration(
  client: SupabaseClient,
  token: string,
  submission: PublicSubmission,
): Promise<PublicSubmitResult> {
  const { data, error } = await client.rpc('submit_public_registration', {
    p_token: token,
    p_legal_given_names: submission.legalGivenNames,
    p_legal_family_name: submission.legalFamilyName,
    p_preferred_name: submission.preferredName,
    p_date_of_birth: submission.dateOfBirth,
    p_email: submission.email,
    p_guardian_given_names: submission.guardianGivenNames,
    p_guardian_family_name: submission.guardianFamilyName,
    p_guardian_email: submission.guardianEmail,
    p_consent_collection_notice: true,
    p_consent_photograph: submission.consentPhotograph,
    p_consent_publicity: submission.consentPublicity,
  });

  if (error !== null) {
    // The function gives one message for every bad token — unknown, revoked
    // and expired are indistinguishable on purpose, so a prober learns
    // nothing about which guesses were close. The screen keeps that.
    if (error.message.includes('invitation_invalid')) {
      return {
        ok: false,
        reason: 'invitation-invalid',
        detail: 'This registration link is not valid. Ask the club for a current one.',
      };
    }
    return { ok: false, reason: 'rejected', detail: error.message };
  }

  return { ok: true, registrationId: String(data) };
}
