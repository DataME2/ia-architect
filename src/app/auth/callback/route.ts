import { NextResponse, type NextRequest } from 'next/server';

import { createRequestClient } from '../../../data/server.ts';
import { safeDestination } from '../../../web/safe-destination.ts';

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

  if (code === null) {
    return NextResponse.redirect(`${origin}/sign-in?next=%2Fregistrar`);
  }

  const client = await createRequestClient();
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error !== null) {
    // A link that is expired, already used, or simply wrong. Not
    // distinguished, for the reason BR73 gives about registration tokens:
    // telling a prober which guesses were close is the whole attack.
    return NextResponse.redirect(`${origin}/sign-in?next=%2Fregistrar`);
  }

  await client.rpc('claim_club_access');

  // A reset link asks to land on the password page; an invitation names
  // nothing and falls back to the club, where the layout insists on a
  // password anyway. `safeDestination` keeps this from becoming an open
  // redirect on the one route that hands out sessions.
  const next = safeDestination(request.nextUrl.searchParams.get('next'));
  return NextResponse.redirect(`${origin}${next}`);
}
