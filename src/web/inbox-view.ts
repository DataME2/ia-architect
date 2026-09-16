/**
 * An account's own notification inbox — what the bell shows, and how many
 * are unread.
 *
 * Pure, like every other screen decision here. Distinct from
 * `src/data/notifications.ts`, which composes and sends the platform's
 * emails (BR42, BR50, …) — this is the bell in the corner of a staff
 * member's own screen, reading a fact already recorded for them rather
 * than sending anything.
 */

export interface InboxNotification {
  readonly id: string;
  readonly kind: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly linkPath: string | null;
  readonly createdAt: string;
  readonly readAt: string | null;
}

/** How many of these has nobody looked at yet. */
export function unreadCount(notifications: readonly InboxNotification[]): number {
  return notifications.filter((n) => n.readAt === null).length;
}

/** Newest first — what somebody opening the bell wants to see at the top. */
export function sortedByRecency(
  notifications: readonly InboxNotification[],
): readonly InboxNotification[] {
  return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * `2026-09-16 14:32` from a timestamp.
 *
 * Not a relative "3 minutes ago" — that reads as stale the moment the page
 * is left open, and a bell nobody has fetched fresh data for since should
 * not claim a freshness it cannot back up.
 */
export function stamp(iso: string): string {
  return iso.length >= 16 ? iso.slice(0, 16).replace('T', ' ') : iso;
}
