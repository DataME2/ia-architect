import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FixtureTeam {
  name: string;
  logoUrl?: string;
  score?: number;
}

export interface FixtureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Home team name or team details object */
  homeTeam: string | FixtureTeam;
  /** Away team name or team details object */
  awayTeam: string | FixtureTeam;
  /** Scheduled fixture date string (e.g. "Sat 12 Oct 2026") */
  date: string;
  /** Scheduled fixture time string (e.g. "3:00 PM") */
  time?: string;
  /** Competition or division title (e.g. "FQ Academy U15 North") */
  competition?: string;
  /** Venue ground or field location */
  venue?: string;
  /**
   * Match operational status.
   * @default 'UPCOMING'
   */
  status?: 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  /** Flag indicating if the active team perspective is playing at home */
  isHomePerspective?: boolean;
  /** Optional bottom action element (e.g. "View Match Sheet" or "Record Result" button) */
  action?: React.ReactNode;
}

export const FixtureCard = React.forwardRef<HTMLDivElement, FixtureCardProps>(
  (
    {
      homeTeam,
      awayTeam,
      date,
      time,
      competition,
      venue,
      status = 'UPCOMING',
      isHomePerspective,
      action,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const homeObj: FixtureTeam = typeof homeTeam === 'string' ? { name: homeTeam } : homeTeam;
    const awayObj: FixtureTeam = typeof awayTeam === 'string' ? { name: awayTeam } : awayTeam;

    const isCompleted = status === 'COMPLETED' || (homeObj.score !== undefined && awayObj.score !== undefined);
    const isLive = status === 'LIVE';

    return (
      <div
        ref={ref}
        className={cn(
          'rounded bg-surface border border-border p-ds-4 shadow-xs transition-all duration-180',
          className
        )}
        {...props}
      >
        {/* Header: Date, Competition & Status */}
        <div className="flex items-center justify-between gap-ds-2 text-xs text-muted pb-ds-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-ds-1.5 flex-wrap font-medium">
            <span className="font-semibold text-foreground font-sans">{date}</span>
            {time && <span>· {time}</span>}
            {competition && <span className="text-muted-foreground">· {competition}</span>}
          </div>

          <div className="flex items-center gap-ds-2">
            {isHomePerspective !== undefined && (
              <span
                className={cn(
                  'px-ds-1.5 py-0.5 text-[0.7rem] font-bold uppercase rounded-sm',
                  isHomePerspective
                    ? 'bg-primary-soft text-primary'
                    : 'bg-secondary text-muted-foreground'
                )}
              >
                {isHomePerspective ? 'Home' : 'Away'}
              </span>
            )}

            {isLive && (
              <span className="inline-flex items-center gap-ds-1 px-ds-2 py-0.5 text-[0.7rem] font-bold uppercase rounded-full bg-destructive text-destructive-foreground animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive-indicator" />
                Live
              </span>
            )}

            {status === 'POSTPONED' && (
              <span className="px-ds-2 py-0.5 text-[0.7rem] font-bold uppercase rounded-full bg-warning text-warning-foreground">
                Postponed
              </span>
            )}
          </div>
        </div>

        {/* Center: Teams & VS / Scoreline */}
        <div className="py-ds-4 flex items-center justify-between gap-ds-3">
          {/* Home Team */}
          <div className="flex-1 min-w-0 flex items-center gap-ds-3 justify-start">
            {homeObj.logoUrl && (
              <img
                src={homeObj.logoUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
              />
            )}
            <div className="min-w-0">
              <span className="font-bold text-sm sm:text-base text-foreground leading-tight block truncate">
                {homeObj.name}
              </span>
              <span className="text-[0.72rem] text-muted uppercase font-semibold">Home</span>
            </div>
          </div>

          {/* Center Badge: Score or VS */}
          <div className="shrink-0 flex items-center justify-center px-ds-3 py-ds-1 rounded bg-surfaceSubtle border border-border font-mono">
            {isCompleted ? (
              <span className="text-lg font-bold tabular-nums text-foreground tracking-tight">
                {homeObj.score ?? 0} - {awayObj.score ?? 0}
              </span>
            ) : (
              <span className="text-xs font-bold uppercase tracking-wider text-muted">VS</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 min-w-0 flex items-center gap-ds-3 justify-end text-right">
            <div className="min-w-0">
              <span className="font-bold text-sm sm:text-base text-foreground leading-tight block truncate">
                {awayObj.name}
              </span>
              <span className="text-[0.72rem] text-muted uppercase font-semibold">Away</span>
            </div>
            {awayObj.logoUrl && (
              <img
                src={awayObj.logoUrl}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-border"
              />
            )}
          </div>
        </div>

        {/* Footer: Venue & Optional Action */}
        <div className="pt-ds-3 border-t border-border flex items-center justify-between gap-ds-2 text-xs text-muted flex-wrap">
          <div className="flex items-center gap-ds-1.5 min-w-0 truncate">
            <svg
              className="w-3.5 h-3.5 shrink-0 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <span className="truncate font-medium">{venue || 'Venue TBD'}</span>
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>

        {children}
      </div>
    );
  }
);

FixtureCard.displayName = 'FixtureCard';