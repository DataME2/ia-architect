import type { SupabaseClient } from '@supabase/supabase-js';

import { landingFor, type SafeDestination } from '../../web/safe-destination.ts';

/**
 * What happens once a link has made a session: **claim** whatever access
 * was recorded against the email before the person existed, then choose
 * where they land. Shared by `/auth/callback` (emailed links) and
 * `/welcome` (a link an administrator sent, scope 109).
 *
 * The claims are what remove the platform owner from the loop: a club is
 * provisioned with its responsible people named, they follow a link, and
 * their administrator membership exists without anybody granting it by
 * hand. `claim_club_access` reads the email from their own session and
 * never from an argument, so it can only ever claim what was addressed to
 * the person signing in.
 */
export async function arrive(client: SupabaseClient, next: string | null): Promise<SafeDestination> {
  await client.rpc('claim_club_access');

  // A guardian invited under scope 35's WP4 has no club_membership to claim
  // — this links their account to the Person the invitation already named
  // (decision 10), and grants nothing club_membership would (decision 11).
  // Both calls are cheap no-ops when nothing is pending, so no branch is
  // needed to tell an officer's link from a guardian's.
  await client.rpc('claim_family_access');

  // A player invited under scope 64/BR150 has no club_membership either,
  // for the identical reason. Same shape, same reason it costs nothing to
  // call unconditionally.
  await client.rpc('claim_player_access');

  // Somebody appointed to an office or club function (scope 68, BR153):
  // links the account to the Person the confirmer named and grants the
  // access that appointment carries. A no-op when nothing is pending.
  await client.rpc('claim_staff_access');

  // A reset link asks to land on the password page; an invitation names
  // nothing and falls back to the club — or to the console, for the one
  // identity that has no club and never will. `landingFor` keeps this from
  // becoming an open redirect on the one route that hands out sessions:
  // anything not on the published list is discarded rather than followed.
  const { data: isPlatform } = await client.rpc('app_is_platform');
  return landingFor(next, isPlatform === true);
}
