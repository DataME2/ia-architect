/**
 * Request-scoped Supabase clients for the App Router.
 *
 * These carry the signed-in user's session from the request cookies, so
 * every query runs as that user and **Row-Level Security applies**. That is
 * the whole point: a screen that forgets a `club_id` filter returns nothing
 * rather than another club's children (P5).
 *
 * `createAdminClient` in `client.ts` is the deliberate exception, and it is
 * never used to serve a page.
 */
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { readPublicConfig } from './env.ts';

/**
 * A Supabase client bound to this request's session.
 *
 * Writes to the cookie store are attempted and allowed to fail: a Server
 * Component cannot set cookies, and the middleware refreshes the session on
 * the way through instead.
 */
export async function createRequestClient(): Promise<SupabaseClient> {
  const { supabaseUrl, supabaseAnonKey } = readPublicConfig();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component render — the middleware owns refresh here.
        }
      },
    },
  });
}

export interface SignedInUser {
  readonly id: string;
  readonly email: string | null;
  /**
   * When this session began, so a screen can answer "which session am I
   * running" rather than only "am I signed in".
   */
  readonly lastSignInAt: string | null;
}

/**
 * The signed-in user, or `null`.
 *
 * Uses `getUser()` rather than `getSession()` on purpose: `getSession()`
 * trusts the cookie, while `getUser()` verifies the token with Supabase.
 * On the server the difference is the difference between authentication and
 * a forgeable claim.
 */
export async function currentUser(client: SupabaseClient): Promise<SignedInUser | null> {
  const { data, error } = await client.auth.getUser();
  if (error !== null || data.user === null) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    lastSignInAt: data.user.last_sign_in_at ?? null,
  };
}
