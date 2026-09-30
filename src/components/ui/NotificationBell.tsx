'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusPill } from './StatusPill';

export interface NotificationItem {
  id: string;
  headline: string;
  detail?: string | null;
  createdAt?: string;
  readAt?: string | null;
  linkPath?: string | null;
}

export interface NotificationBellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * List of user notifications.
   */
  notifications?: readonly NotificationItem[];
  /**
   * Explicit unread count overriding derived count from notifications array.
   */
  unreadCount?: number;
  /**
   * Callback invoked when user marks an individual notification as read.
   */
  onMarkRead?: (id: string) => void;
  /**
   * Callback invoked when user clicks clear all or mark all as read.
   */
  onClearAll?: () => void;
  /**
   * Custom label for the notification bell button.
   */
  ariaLabel?: string;
}

export const NotificationBell = React.forwardRef<HTMLDivElement, NotificationBellProps>(
  (
    {
      notifications = [],
      unreadCount: customUnreadCount,
      onMarkRead,
      onClearAll,
      ariaLabel,
      className,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const computedUnreadCount = customUnreadCount ?? notifications.filter((n) => !n.readAt).length;

    // Close on outside click
    React.useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
      }

      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen]);

    const toggleOpen = () => setIsOpen((prev) => !prev);

    const defaultLabel = ariaLabel ?? (
      computedUnreadCount > 0
        ? `Notifications, ${computedUnreadCount} unread`
        : 'Notifications, none unread'
    );

    return (
      <div
        ref={(node) => {
          // preserve forwarded ref if object ref
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn('relative inline-block font-sans', className)}
        {...props}
      >
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={defaultLabel}
          onClick={toggleOpen}
          className={cn(
            'relative inline-flex items-center justify-center w-11 h-11 rounded-sm border border-border bg-surface text-foreground shadow-xs cursor-pointer transition-colors duration-180',
            'hover:bg-surfaceSubtle hover:border-border-strong',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            isOpen && 'bg-surfaceSubtle border-primary'
          )}
        >
          <svg
            className="w-5 h-5 text-foreground shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>

          {computedUnreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center font-mono text-[10px] font-bold rounded-full bg-warning text-warning-foreground border border-warning-indicator/40 shadow-xs"
              aria-hidden="true"
            >
              {computedUnreadCount > 99 ? '99+' : computedUnreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute right-0 mt-ds-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-DEFAULT border border-border bg-surface p-ds-3 shadow-md z-50 focus:outline-none"
          >
            <div className="flex items-center justify-between pb-ds-2 mb-ds-2 border-b border-border">
              <div className="flex items-center gap-ds-2">
                <h3 className="text-sm font-semibold text-foreground m-0">Notifications</h3>
                {computedUnreadCount > 0 && (
                  <StatusPill variant="pending" size="sm" label={`${computedUnreadCount} unread`} />
                )}
              </div>
              {onClearAll && notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="py-ds-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </div>
            ) : (
              <ul className="flex flex-col gap-ds-2 p-0 m-0 list-none" role="list">
                {notifications.map((item) => {
                  const isUnread = !item.readAt;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-start gap-ds-2.5 p-ds-2.5 rounded-sm border transition-colors duration-180',
                        isUnread
                          ? 'border-border bg-surfaceSubtle font-medium'
                          : 'border-transparent bg-transparent opacity-75'
                      )}
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0 mt-1.5',
                          isUnread ? 'bg-warning-indicator' : 'bg-muted-foreground/30'
                        )}
                        aria-hidden="true"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-foreground leading-snug">
                          {item.linkPath ? (
                            <a
                              href={item.linkPath}
                              className="font-semibold text-primary hover:underline"
                            >
                              {item.headline}
                            </a>
                          ) : (
                            <span className="font-semibold">{item.headline}</span>
                          )}
                        </div>

                        {item.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5 mb-0 leading-normal">
                            {item.detail}
                          </p>
                        )}

                        {item.createdAt && (
                          <span className="block font-mono text-[10px] text-muted-foreground mt-1">
                            {item.createdAt}
                          </span>
                        )}
                      </div>

                      {isUnread && onMarkRead && (
                        <button
                          type="button"
                          onClick={() => onMarkRead(item.id)}
                          className="shrink-0 min-h-[44px] text-[11px] font-medium px-ds-2 py-0.5 rounded border border-border bg-surface hover:bg-surfaceSubtle text-foreground transition-colors cursor-pointer"
                        >
                          Mark read
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }
);

NotificationBell.displayName = 'NotificationBell';