/**
 * An account's own notification inbox (0050) — the bell's reads and writes.
 *
 * Distinct from `notifications.ts`, which sends the platform's emails.
 * This never sends anything: a `notification` row is created only by a
 * `security definer` function that already verified the event it
 * announces, so there is nothing to compose here — only to read, and to
 * mark read.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { InboxNotification } from '../web/inbox-view.ts';

interface NotificationRow {
  readonly id: string;
  readonly kind: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly link_path: string | null;
  readonly created_at: string;
  readonly read_at: string | null;
}

function toNotification(row: NotificationRow): InboxNotification {
  return {
    id: row.id,
    kind: row.kind,
    headline: row.headline,
    detail: row.detail,
    linkPath: row.link_path,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

/**
 * The signed-in account's own notifications. RLS already narrows this to
 * `recipient_user_id = auth.uid()` — the explicit filter is here so the
 * call says what it means, the same reason `loadFamilyDesignations` gives.
 *
 * **Fails to an empty inbox rather than throwing**, the same choice
 * `loadFeed` makes for the calendar feed. This is called from the registrar
 * layout — every page, every request — so a query that cannot be served
 * (a transient fault, a migration not yet applied) must not take the whole
 * section down for a bell that is, by its own design, "what was true when
 * this layout rendered": the honest response to not knowing is to show
 * nothing, not to crash. `supabase/tests/51_a_bell_for_the_referee_coordinator.sql`
 * proves the policy itself is correct; this is only about what a caller
 * that policy has never seen gets back when something else goes wrong.
 */
export async function loadNotifications(
  client: SupabaseClient,
  userId: string,
): Promise<readonly InboxNotification[]> {
  const { data, error } = await client
    .from('notification')
    .select('id, kind, headline, detail, link_path, created_at, read_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error !== null) return [];
  return (data as NotificationRow[]).map(toNotification);
}

/** Marks one notification read. The policy refuses this for anybody else's. */
export async function markNotificationRead(
  client: SupabaseClient,
  notificationId: string,
): Promise<string | null> {
  const { error } = await client
    .from('notification')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  return error === null ? null : error.message.replace(/^.*?:\s*/, '');
}
