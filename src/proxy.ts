/**
 * Refreshes the Supabase session on every request.
 *
 * Server Components cannot set cookies, so without this a rotated refresh
 * token would never be written back and a registrar would be signed out
 * mid-season for no visible reason. This proxy (Next 16's replacement for
 * the middleware convention) is the one place in the request that can both
 * read and write them.
 *
 * It is **not** an authorisation boundary. What a signed-in user may read is
 * decided by Row-Level Security in the database (P5); this only keeps the
 * session alive and sends an anonymous visitor to sign in first.
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { readPublicConfig } from './data/env.ts';

/**
 * Paths requiring a club session.
 *
 * `/join/...` is deliberately absent: a family following an invitation link
 * has no account, which is the entire point of BR72. Its authorisation is
 * the token, checked by the database when the form is submitted — not by
 * anything here.
 */
const PROTECTED = ['/registrar', '/register'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { supabaseUrl, supabaseAnonKey } = readPublicConfig();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() verifies the token with Supabase rather than trusting the
  // cookie, and is what actually triggers the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (user === null && PROTECTED.some((prefix) => path.startsWith(prefix))) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = '/sign-in';
    signIn.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
