import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The club screens' dark identity rail (Superdesign "Registrar - Purple &
 * Teal"): brand, the club, the roles that apply here, a way to the person's
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

export function RegistrarRail({ clubName, roles, personName, switchHref, nav, className }: RegistrarRailProps) {
  return (
    <div className={cn('font-sans flex flex-col gap-ds-5 p-ds-4 rounded-lg bg-rail text-rail-foreground', className)}>
      <p className="m-0 leading-snug">
        <span className="block text-xl">Let&rsquo;sDataTalk</span>
        <span className={cn('block text-[10px] text-rail-muted', MONO)}>Football / club workspace</span>
      </p>

      <div className="rounded-md bg-rail-line p-ds-4">
        <p className="m-0 text-sm font-semibold">{clubName}</p>
        <p className={cn('m-0 mt-ds-2 text-[10px] text-rail-muted', MONO)}>Club administration</p>
      </div>

      <div className="flex flex-col gap-ds-2">
        <p className={cn('m-0 text-[10px] text-rail-muted', MONO)}>Active here</p>
        <p className="m-0 text-[15px] font-semibold">{roles.length === 0 ? 'No club role' : roles.join(' · ')}</p>
        <a
          href={switchHref}
          className={cn(
            // globals.css underlines every <a> and recolours it on hover.
            'flex items-center justify-between min-h-[44px] px-ds-3 rounded-sm border border-rail-line text-xs no-underline',
            'text-rail-foreground hover:text-rail-foreground hover:bg-rail-line transition-colors duration-180',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
          )}
        >
          <span>Switch role</span>
          <span aria-hidden="true">&#8597;</span>
        </a>
      </div>

      {nav}

      <div className="border-t border-rail-line pt-ds-4 text-xs text-rail-muted">
        {personName !== null && <p className="m-0 text-sm font-semibold text-rail-foreground">{personName}</p>}
        <p className="m-0 mt-ds-1">One person. Separate role permissions.</p>
      </div>
    </div>
  );
}
