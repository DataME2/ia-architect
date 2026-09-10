import { NextResponse, type NextRequest } from 'next/server';

import { createRequestClient } from '../../../data/server.ts';
import { landingFor, NO_CREDENTIAL_DESTINATION } from '../../../web/safe-destination.ts';

/**
 * Where a sign-in link lands.
 *
 * Two steps. Exchange the one-time code for a session — which is also the
 * moment the account is created, if the link was an invitation to somebody
 * who had none. Then **claim** whatever access was recorded against their
 * email address before they existed.
 *
 * That second call is what removes the platform owner from the loop: a club
 * is provisioned with its responsible people named, they follow a link, and
 * their administrator membership exists without anybody granting it by
 * hand. `claim_club_access` reads the email from their own session and
 * never from an argument, so it can only ever claim what was addressed to
 * the person signing in.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const origin = request.nextUrl.origin;

  // No code and a dead code both mean the same thing to the person holding
  // the link: it did not work. Sending them to `/sign-in` asked for a
  // password they may never have had — the same closed circle `/set-password`
  // used to have — so both land there instead, where a fresh link is one
  // address away.
  if (code === null) {
    return NextResponse.redirect(`${origin}${NO_CREDENTIAL_DESTINATION}`);
  }

  const client = await createRequestClient();
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // A link that is expired, already used, or simply wrong. Not
    // distinguished, for the reason BR73 gives about registration tokens:
    // telling a prober which guesses were close is the whole attack.
    return NextResponse.redirect(`${origin}${NO_CREDENTIAL_DESTINATION}`);
  }

  await client.rpc('claim_club_access');

  // A guardian invited under scope 35's WP4 has no club_membership to claim
  // — this links their account to the Person the invitation already named
  // (decision 10), and grants nothing club_membership would (decision 11).
  // Both calls are cheap no-ops when nothing is pending, so no branch is
  // needed to tell an officer's link from a guardian's.
  await client.rpc('claim_family_access');

  // A reset link asks to land on the password page; an invitation names
  // nothing and falls back to the club — or to the console, for the one
  // identity that has no club and never will. `landingFor` keeps this from
  // becoming an open redirect on the one route that hands out sessions:
  // anything not on the published list is discarded rather than followed.
  const { data: isPlatform } = await client.rpc('app_is_platform');
  // A guardian holds no club_membership (decision 11) — checked directly
  // rather than assumed, so a genuine officer's landing page is unaffected.
  const { data: membershipRows } = await client.from('club_membership').select('id').limit(1);
  const next = landingFor(
    request.nextUrl.searchParams.get('next'),
    isPlatform === true,
    (membershipRows?.length ?? 0) > 0,
  );
  return NextResponse.redirect(`${origin}${next}`);
}
