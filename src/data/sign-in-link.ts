import { createAdminClient } from './client.ts';
import { linkType, refuseSignInLink, type LinkType } from '../web/sign-in-link.ts';

/** Where access waits for an email until its first sign-in claims it. */
const WAITING_ACCESS = ['club_contact', 'guardian_invitation', 'player_invitation', 'appointment_access'] as const;

/** Where an account's access lives once it has some. */
const HELD_ACCESS = ['club_membership', 'account_person', 'platform_admin'] as const;

export type SignInLink =
  | { readonly ok: true; readonly tokenHash: string; readonly type: LinkType }
  | { readonly ok: false; readonly message: string };

const UNCHECKED: SignInLink = {
  ok: false,
  message: 'Could not check this account, so no link was made. Resend link still works.',
};

/**
 * Make a person's single-use sign-in link without emailing it (BR180,
 * scope 109). The caller has already proved, as the signed-in user, that
 * they may resend this invitation at `clubId`.
 *
 * The service role is needed twice: Supabase makes a link without sending
 * it only through its admin API, and the checks must see every club, which
 * RLS rightly hides. Fails closed: any error, and no link.
 *
 * The account's own ties can be read only once the link exists, because
 * the admin API looks accounts up by id. A refused link is never shown, so
 * the only cost is that it replaces a link emailed earlier.
 */
export async function createSignInLink(clubId: string, email: string): Promise<SignInLink> {
  const admin = createAdminClient('sign-in-link');

  // ilike, as the claims compare lower-case. A `_` in the address matches
  // more rows, never fewer, so it can only refuse more.
  const waiting = await Promise.all(
    WAITING_ACCESS.map((table) => admin.from(table).select('club_id').ilike('email', email).is('claimed_at', null)),
  );
  if (waiting.some((r) => r.error !== null)) return UNCHECKED;
  const waitingClubIds = waiting.flatMap((r) => (r.data ?? []).map((row) => String(row.club_id)));
  const early = refuseSignInLink(clubId, email, { hasSignedIn: false, holdsAccess: false, waitingClubIds });
  if (early !== null) return { ok: false, message: early };

  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (error !== null) return { ok: false, message: `Supabase did not make a link: ${error.message}` };

  const held = await Promise.all(
    HELD_ACCESS.map((table) =>
      admin.from(table).select('user_id', { count: 'exact', head: true }).eq('user_id', data.user.id),
    ),
  );
  if (held.some((r) => r.error !== null)) return UNCHECKED;

  const refusal = refuseSignInLink(clubId, email, {
    hasSignedIn: data.user.last_sign_in_at != null,
    holdsAccess: held.some((r) => (r.count ?? 0) > 0),
    waitingClubIds,
  });
  if (refusal !== null) return { ok: false, message: refusal };

  const type = linkType(data.properties.verification_type);
  if (type === null) return UNCHECKED;
  return { ok: true, tokenHash: data.properties.hashed_token, type };
}
