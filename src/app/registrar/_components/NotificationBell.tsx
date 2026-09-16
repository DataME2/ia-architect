'use client';

import { useActionState, useState } from 'react';

import { sortedByRecency, stamp, unreadCount, type InboxNotification } from '../../../web/inbox-view.ts';
import { IDLE_FORM } from '../../../web/form-result.ts';
import { markNotificationReadAction } from './inbox-actions.ts';

function MarkReadButton({ notificationId }: { readonly notificationId: string }) {
  const [state, action, pending] = useActionState(markNotificationReadAction, IDLE_FORM);

  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <button type="submit" className="secondary" disabled={pending} style={{ padding: '0.15rem 0.5rem' }}>
        {pending ? '…' : 'Mark read'}
      </button>
      {state.status === 'error' && <span className="hint">{state.message}</span>}
    </form>
  );
}

/**
 * A club officer's own notifications — first wired for BR148's officiating
 * interest, and shaped to take a second and third kind without changing.
 *
 * Closed by default and opened on click rather than a hover, so a badge
 * reading 3 does not itself claim to be the notification — pressing it is.
 * Fetched once with the page (0050's own note: no live push here, the same
 * "the refresh cycle is the client's" acceptance the calendar feed makes).
 */
export function NotificationBell({
  notifications,
}: {
  readonly notifications: readonly InboxNotification[];
}) {
  const [open, setOpen] = useState(false);
  const unread = unreadCount(notifications);
  const ordered = sortedByRecency(notifications);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="secondary"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications, none unread'}
        onClick={() => setOpen((v) => !v)}
        style={{ position: 'relative', padding: '0.25rem 0.6rem' }}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 && (
          <span
            className="pill pill-warn"
            aria-hidden="true"
            style={{
              position: 'absolute', top: '-0.5rem', right: '-0.5rem',
              minWidth: '1.1rem', padding: '0 0.3rem', fontSize: '0.65rem',
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute', right: 0, top: '2rem', width: '22rem', maxWidth: '90vw',
            maxHeight: '60vh', overflowY: 'auto', zIndex: 20,
          }}
        >
          {ordered.length === 0 ? (
            <p className="empty" style={{ margin: 0 }}>
              Nothing here yet.
            </p>
          ) : (
            <ul className="check" style={{ margin: 0, padding: 0 }}>
              {ordered.map((n) => (
                <li key={n.id} style={{ opacity: n.readAt === null ? 1 : 0.6 }}>
                  <span className={n.readAt === null ? 'box todo' : 'box done'} aria-hidden="true" />
                  <span>
                    <span className="ctitle">
                      {n.linkPath !== null ? <a href={n.linkPath}>{n.headline}</a> : n.headline}
                    </span>
                    {n.detail !== null && (
                      <>
                        <br />
                        <span className="cnote">{n.detail}</span>
                      </>
                    )}
                    <br />
                    <span className="hint" style={{ fontSize: '0.7rem' }}>
                      {stamp(n.createdAt)}
                    </span>
                  </span>
                  {n.readAt === null && (
                    <span className="rid">
                      <MarkReadButton notificationId={n.id} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
