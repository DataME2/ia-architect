/**
 * Supabase clients.
 *
 * Three of them, because they differ in exactly one way that matters: whether
 * Row-Level Security applies. P5 (strict tenant isolation) is enforced by
 * those policies, so the client you pick decides whether the principle holds
 * for that query.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readPublicConfig, readServiceConfig } from './env.ts';

/**
 * For the browser, and for server code acting as the signed-in user.
 *
 * RLS applies. This is the default and should be almost every call.
 */
export function createUserClient(accessToken?: string): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = readPublicConfig();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    ...(accessToken === undefined
      ? {}
      : { global: { headers: { Authorization: `Bearer ${accessToken}` } } }),
  });
}

/**
 * Reasons a caller may legitimately bypass Row-Level Security.
 *
 * A closed set rather than a free string, so every bypass in the codebase is
 * greppable and the list itself is reviewable. Adding a member is a
 * deliberate act; passing one is not something that happens by accident.
 */
export type RlsBypassReason =
  /** Provisioning a club, before any membership row exists to authorise it. */
  | 'tenant-provisioning'
  /** Scheduled work with no signed-in user: BR50, BR51, BR67. */
  | 'scheduled-job'
  /** Building a pack across a club's rows on the registrar's behalf (C16). */
  | 'submission-pack-generation';

/**
 * The service-role client. **Bypasses Row-Level Security entirely.**
 *
 * Every call must state a reason and scope itself to one club by hand,
 * because the database will not do it for you here. This is the code that
 * gets reviewed hardest, and the reason argument exists so a reviewer can
 * find all of it with one grep.
 *
 * @throws if called anywhere a browser could reach.
 */
export function createAdminClient(reason: RlsBypassReason): SupabaseClient {
  // Checked via globalThis so this module needs no DOM lib — it is server code.
  if ((globalThis as { window?: unknown }).window !== undefined) {
    throw new Error(
      `createAdminClient(${reason}) was called in a browser. The service-role ` +
        'key bypasses Row-Level Security for every club and must never leave the server.',
    );
  }
  const { supabaseUrl } = readPublicConfig();
  const { supabaseServiceRoleKey } = readServiceConfig();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
