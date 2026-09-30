'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SessionPerson {
  preferredName?: string;
  legalName: string;
}

export interface SessionUser {
  email?: string;
  lastSignInAt?: string | number | Date | null;
}

export interface SessionTenant {
  clubName: string;
  person?: SessionPerson | null;
  roles?: string[];
}

export interface SessionStripProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Signed-in user details */
  user: SessionUser | null;
  /** Active tenant / club context */
  tenant?: SessionTenant | null;
  /** Marks the strip as operating in a demonstration club environment */
  demo?: boolean;
  /** Platform owner user flag (no club membership required) */
  platform?: boolean;
  /**
   * The sign-out form's action — a server action in this app. A form rather
   * than a click handler, so it works from a server-rendered screen and
   * without JavaScript.
   */
  signOutAction?: (formData: FormData) => void | Promise<void>;
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  registrar: 'Registrar',
  treasurer: 'Treasurer',
  committee: 'Committee',
  coach: 'Coach',
  coordinator: 'Coordinator',
  viewer: 'Viewer — read-only',
};

export const SessionStrip = React.forwardRef<HTMLDivElement, SessionStripProps>(
  (
    {
      user,
      tenant,
      demo = false,
      platform = false,
      signOutAction,
      className,
      ...props
    },
    ref
  ) => {
    if (!user) return null;

    const personDisplayName =
      tenant?.person != null
        ? tenant.person.preferredName?.trim() || tenant.person.legalName
        : user.email ?? 'Signed in';

    // Plain computation, not useMemo: a hook after the early return above
    // would break React's rules of hooks, and this costs nothing to redo.
    const signedIn = user.lastSignInAt ? new Date(user.lastSignInAt) : null;
    const formattedSignInTime =
      signedIn === null || Number.isNaN(signedIn.getTime())
        ? null
        : signedIn.toLocaleString('en-AU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-md text-xs font-sans border transition-colors',
          demo
            ? 'bg-warning/20 border-warning-indicator text-foreground'
            : 'bg-surface border-border text-foreground shadow-xs',
          className
        )}
        {...props}
      >
        {/* Identity & Context Info Left Column */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            className="font-semibold text-foreground truncate"
            title={tenant?.person?.legalName}
          >
            {personDisplayName}
          </span>

          {tenant && (
            <>
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-foreground">{tenant.clubName}</span>

              {demo && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-warning text-warning-foreground border border-warning-indicator">
                  Demo
                </span>
              )}

              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>

              {tenant.person != null && user.email && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {user.email}
                </span>
              )}

              {tenant.roles && tenant.roles.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 ml-1">
                  {tenant.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-backgroundSunk text-foreground border border-border"
                    >
                      {ROLE_LABEL[role] ?? role}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {!tenant && (
            <>
              <span className="text-muted-foreground" aria-hidden="true">
                ·
              </span>
              {platform ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-warning text-warning-foreground border border-warning-indicator">
                  Platform owner — no club, by design
                </span>
              ) : (
                <span className="text-muted-foreground italic">No club membership</span>
              )}
            </>
          )}
        </div>

        {/* Action & Timestamp Right Column */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {formattedSignInTime && (
            <span className="font-mono text-[11px] text-muted-foreground">
              since {formattedSignInTime}
            </span>
          )}

          {signOutAction && (
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex items-center justify-center min-h-[44px] px-3 py-1 rounded-sm text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-surfaceSubtle hover:border-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }
);

SessionStrip.displayName = 'SessionStrip';