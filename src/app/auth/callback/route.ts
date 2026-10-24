import { NextResponse, type NextRequest } from 'next/server';

import { createRequestClient } from '../../../data/server.ts';
import { NO_CREDENTIAL_DESTINATION } from '../../../web/safe-destination.ts';
import { arrive } from '../arrive.ts';

/**
 * Where a sign-in link lands.
 *
 * Two steps. Exchange the one-time code for a session — which is also the
 * moment the account is created, if the link was an invitation to somebody
 * who had none. Then `arrive` claims whatever access was recorded against
 * their email address before they existed, and picks where they land.
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

  const next = await arrive(client, request.nextUrl.searchParams.get('next'));
  return NextResponse.redirect(`${origin}${next}`);
}
