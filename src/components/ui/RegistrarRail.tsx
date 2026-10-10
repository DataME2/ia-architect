import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The club screens' side rail (Figma "LTD - Football (Copy)" 2002:461, the
 * light Purple & Teal sidebar): brand, the club, the roles that apply here, a way to the person's
 * own role contexts, then the club menu.
 *
 * On club screens every role held at the club applies at once (the database
 * checks them together), so the rail lists them rather than offering to
 * switch between them. Switching a role is the person's own workspace's
 * business (`/me`, BR61), and "Switch role" goes there.
 *
 * Presentational: the menu arrives as `nav`.
 */
export interface RegistrarRailProps {
  readonly clubName: string;
  /** The club roles this account holds, already labelled ("Registrar", "Treasurer"). */
  readonly roles: readonly string[];
  /** The person's name, or null when the account is not linked to one (BR108). */
  readonly personName: string | null;
  /** Where "Switch role" goes: the person's own workspace. */
  readonly switchHref: string;
  readonly nav: React.ReactNode;
  readonly className?: string;
}

const MONO = 'font-mono uppercase tracking-wider';

/** "North Star FC" → "NS": a mark from the name, never an invented logo. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
}

export function RegistrarRail({ clubName, roles, personName, switchHref, nav, className }: RegistrarRailProps) {
  return (
    <div className={cn('font-sans flex flex-col gap-ds-5 p-ds-4 rounded-lg bg-surface border border-border text-foreground shadow-xs', className)}>
      <p className="m-0 flex items-center gap-ds-3 leading-snug">
        <span aria-hidden="true" className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground font-bold">
          L
        </span>
        <span>
          <span className="block text-lg font-bold">Let&rsquo;sDataTalk</span>
          <span className={cn('block text-[10px] text-muted-foreground', MONO)}>Football / club workspace</span>
        </span>
      </p>

      <div className="flex items-center gap-ds-3 rounded-md bg-backgroundSunk p-ds-3">
        <span aria-hidden="true" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-soft text-primary text-xs font-bold">
          {initials(clubName)}
        </span>
        <span className="min-w-0">
          <span className={cn('block text-[10px] text-muted-foreground', MONO)}>Current club</span>
          <span className="block text-sm font-semibold truncate">{clubName}</span>
        </span>
      </div>

      <div className="flex flex-col gap-ds-2">
        <p className={cn('m-0 text-[10px] text-muted-foreground', MONO)}>Active here</p>
        <p className="m-0 text-[15px] font-semibold">{roles.length === 0 ? 'No club role' : roles.join(' · ')}</p>
        <a
          href={switchHref}
          className={cn(
            // globals.css underlines every <a> and recolours it on hover.
            'flex items-center justify-between min-h-[44px] px-ds-3 rounded-sm border border-border text-xs no-underline',
            'text-foreground hover:text-foreground hover:bg-surfaceSubtle transition-colors duration-180',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          )}
        >
          <span>Switch role</span>
          <span aria-hidden="true">&#8597;</span>
        </a>
      </div>

      {nav}

      <div className="border-t border-border pt-ds-4 text-xs text-muted-foreground">
        {personName !== null && <p className="m-0 text-sm font-semibold text-foreground">{personName}</p>}
        <p className="m-0 mt-ds-1">One person. Separate role permissions.</p>
      </div>
    </div>
  );
}
