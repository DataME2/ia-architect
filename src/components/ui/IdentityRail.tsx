'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { RoleSwitcher, type RoleHolding } from './RoleSwitcher';

export interface IdentityRailProps extends React.HTMLAttributes<HTMLElement> {
  /** Preferred or chosen person name */
  personName: string;
  /** Official legal name displayed verbatim without formatting changes */
  legalName: string;
  /** List of role contexts held by this person */
  contexts: RoleHolding[];
  /** Key identifier of the currently active operational role */
  activeRoleKey?: string | undefined;
  /** Club ID of the currently active role context */
  activeClubId?: string | undefined;
  /** Total number of unique clubs associated with the user. Defaults to unique context club count */
  clubCount?: number;
  /** Total number of duplicate accounts detected (defaults to 0) */
  duplicateAccountCount?: number;
  /** Total sign-in counter (defaults to 1) */
  signInCount?: number;
  /** URL path for administration access (e.g., "/registrar"), or null if unprivileged */
  officerHref?: string | null;
  /** Label text for the officer administration link */
  officerLabel?: string;
  /** The sign-out form's action — a server action in this app, so it works without JavaScript. */
  signOutAction?: (formData: FormData) => void | Promise<void>;
  /** Callback triggered when a role context is selected */
  onRoleSelect?: (role: RoleHolding) => void;
  /** Optional club crest badge image URL */
  crestUrl?: string;
  /** Optional text label for empty crest badge slot. Defaults to "CREST" */
  crestLabel?: string;
  /** Optional user avatar image URL */
  avatarUrl?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p !== '');
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (first === undefined || last === undefined) return '??';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

export const IdentityRail = React.forwardRef<HTMLElement, IdentityRailProps>(
  (
    {
      personName,
      legalName,
      contexts,
      activeRoleKey,
      activeClubId,
      clubCount,
      duplicateAccountCount = 0,
      signInCount = 1,
      officerHref,
      officerLabel = 'Club administration →',
      signOutAction,
      onRoleSelect,
      crestUrl,
      crestLabel = 'CREST',
      avatarUrl,
      className,
      ...props
    },
    ref
  ) => {
    const initials = getInitials(personName);

    // Calculate unique club count if not explicitly passed
    const computedClubCount =
      clubCount ?? new Set(contexts.map((c) => c.clubId)).size;

    return (
      <aside
        ref={ref}
        aria-label="You, and the roles you hold"
        className={cn(
          'lg:sticky lg:top-4 print:hidden flex flex-col gap-4 p-4 w-full lg:max-w-[280px] rounded-lg bg-rail text-rail-foreground shadow-md select-none border border-rail-line font-sans',
          className
        )}
        {...props}
      >
        {/* Person Header */}
        <div className="flex items-center gap-3">
          {/* Crest Slot */}
          <div
            className={cn(
              'w-10 h-10 shrink-0 rounded-sm flex items-center justify-center text-[10px] font-mono tracking-tight text-center leading-none text-rail-muted',
              crestUrl
                ? 'bg-cover bg-center border border-rail-line'
                : 'border border-dashed border-rail-muted/60 bg-rail-line/40'
            )}
            style={crestUrl ? { backgroundImage: `url(${crestUrl})` } : undefined}
            aria-hidden="true"
          >
            {!crestUrl && crestLabel}
          </div>

          {/* User Avatar */}
          <div
            className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-success-indicator to-primary border-2 border-white/20 text-white font-bold text-sm grid place-items-center shadow-xs overflow-hidden"
            aria-hidden="true"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Name & Legal Identity */}
          <div className="min-w-0 flex-1">
            <span className="block font-sans font-bold text-sm text-rail-foreground truncate leading-tight">
              {personName}
            </span>
            <span className="block font-mono text-[10px] tracking-wider text-rail-muted uppercase truncate mt-0.5">
              {/* Verbatim (BR55): the `uppercase` class styles it; the text
                  itself is untouched, so a screen reader reads the real name. */}
              Legal: {legalName}
            </span>
          </div>
        </div>

        {/* Identity & Role Ledger */}
        <div className="grid grid-cols-2 gap-px bg-rail-line border border-rail-line rounded-md overflow-hidden text-xs">
          <div className="bg-rail p-2">
            <b className="block font-mono text-sm font-bold text-rail-foreground tabular-nums">
              {signInCount}
            </b>
            <span className="font-mono text-[9px] uppercase tracking-wider text-rail-muted">
              Sign-in
            </span>
          </div>
          <div className="bg-rail p-2">
            <b className="block font-mono text-sm font-bold text-rail-foreground tabular-nums">
              {contexts.length}
            </b>
            <span className="font-mono text-[9px] uppercase tracking-wider text-rail-muted">
              Roles held
            </span>
          </div>
          <div className="bg-rail p-2">
            <b className="block font-mono text-sm font-bold text-rail-foreground tabular-nums">
              {computedClubCount}
            </b>
            <span className="font-mono text-[9px] uppercase tracking-wider text-rail-muted">
              {computedClubCount === 1 ? 'Club' : 'Clubs'}
            </span>
          </div>
          <div className="bg-rail p-2">
            <b
              className={cn(
                'block font-mono text-sm font-bold tabular-nums',
                duplicateAccountCount === 0 ? 'text-success-indicator' : 'text-destructive-indicator'
              )}
            >
              {duplicateAccountCount}
            </b>
            <span className="font-mono text-[9px] uppercase tracking-wider text-rail-muted">
              Duplicate accts
            </span>
          </div>
        </div>

        {/* Role Switcher List */}
        <RoleSwitcher
          roles={contexts}
          activeRoleKey={activeRoleKey}
          activeClubId={activeClubId}
          onRoleSelect={onRoleSelect}
        />

        {/* BR61 Citation Note */}
        <div className="p-2.5 rounded-sm bg-rail-line/60 border border-rail-line text-xs space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold px-1 py-0.5 rounded bg-rail-line text-rail-foreground border border-rail-muted/30">
              BR61
            </span>
            <span className="font-semibold text-xs text-rail-foreground">
              One active role at a time
            </span>
          </div>
          <p className="text-[11px] leading-snug text-rail-muted">
            Switching is explicit and never merges two roles&rsquo; views. The counts are your own; the detail waits behind the switch.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2 pt-2 border-t border-rail-line text-xs">
          {officerHref && (
            <a
              href={officerHref}
              // Rail text, not primary-foreground: that turns near-black in dark
              // mode, on a rail that stays dark in both.
              className="text-rail-foreground hover:text-white no-underline font-medium text-xs transition-colors flex items-center justify-between min-h-[44px] px-2 rounded-sm hover:bg-rail-line/50"
            >
              <span>{officerLabel}</span>
            </a>
          )}
          {signOutAction && (
            <form action={signOutAction}>
              <button
                type="submit"
                // Explicit flex start, no shadow, and important hover colours:
                // globals.css centres every <button>, gives it a shadow, and turns
                // it reef blue on hover with a selector more specific than a
                // utility class.
                className="flex w-full items-center justify-start min-h-[44px] px-3 py-2 rounded-sm border-0 shadow-none bg-rail-line text-rail-foreground hover:bg-rail-line/80! hover:text-rail-foreground! font-medium text-xs transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </aside>
    );
  }
);

IdentityRail.displayName = 'IdentityRail';