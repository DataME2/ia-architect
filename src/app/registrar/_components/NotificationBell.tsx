'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { NotificationBell as DesignNotificationBell } from '../../../components/ui/NotificationBell.tsx';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { sortedByRecency, stamp, type InboxNotification } from '../../../web/inbox-view.ts';
import { markNotificationReadAction } from './inbox-actions.ts';

/**
 * A club officer's own notifications — rendered by the design system's
 * NotificationBell (scope 69). First wired for BR148's officiating interest,
 * and shaped to take a second and third kind without changing.
 *
 * Closed by default and opened on click rather than a hover, so a badge
 * reading 3 does not itself claim to be the notification — pressing it is.
 * Fetched once with the page (0050's own note: no live push here, the same
 * "the refresh cycle is the client's" acceptance the calendar feed makes).
 * Marking one read calls the same server action as before, then refreshes
 * so the count and the list agree with the database.
 */
export function NotificationBell({
  notifications,
}: {
  readonly notifications: readonly InboxNotification[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const markRead = (id: string) => {
    const form = new FormData();
    form.set('notificationId', id);
    startTransition(async () => {
      await markNotificationReadAction(IDLE_FORM, form);
      router.refresh();
    });
  };

  return (
    <DesignNotificationBell
      notifications={sortedByRecency(notifications).map((n) => ({
        id: n.id,
        headline: n.headline,
        detail: n.detail,
        linkPath: n.linkPath,
        readAt: n.readAt,
        createdAt: stamp(n.createdAt),
      }))}
      onMarkRead={markRead}
    />
  );
}
