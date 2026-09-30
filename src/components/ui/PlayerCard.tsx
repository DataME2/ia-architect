import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PlayerStatFigure {
  /** Label for the metric, e.g. "Apps", "Goals", "Min" — also its React key, so unique per card */
  label: string;
  /** Numerical value or string */
  value: string | number;
}

export interface PlayerCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Player display name */
  name: string;
  /** Player legal name (e.g. for registration / ID verification) */
  legalName?: string | undefined;
  /** Squad number assigned to the player */
  squadNumber?: string | number | undefined;
  /** Player position or squad context, e.g. "Forward · U16 Girls" */
  position?: string | undefined;
  /** Player photo URL */
  photoUrl?: string | undefined;
  /** Alt text for photo */
  photoAlt?: string | undefined;
  /** Primary status badge or pill React component */
  statusPill?: React.ReactNode;
  /** Array of performance statistical figures */
  stats?: PlayerStatFigure[] | undefined;
  /**
   * Primary left border bar.
   * @default true
   */
  borderAccent?: boolean;
  /** Optional action bar or buttons at footer */
  actions?: React.ReactNode;
}

export const PlayerCard = React.forwardRef<HTMLDivElement, PlayerCardProps>(
  (
    {
      name,
      legalName,
      squadNumber,
      position,
      photoUrl,
      photoAlt,
      statusPill,
      stats = [],
      borderAccent = true,
      actions,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        // Primary, not volt: volt (accent) is the Assistant's only colour
        // (DESIGN.md Principle 2), so a player card never borrows it.
        className={cn(
          'relative rounded-DEFAULT bg-surface border border-border p-ds-4 shadow-xs hover:border-primary/60 hover:shadow-md transition-all duration-180 group',
          borderAccent && 'border-l-4 border-l-primary',
          className
        )}
        {...props}
      >
        <div className="flex flex-col sm:flex-row items-start gap-ds-4">
          {/* Photo Frame */}
          <div className="relative flex-none w-[84px] h-[84px] sm:w-[92px] sm:h-[92px] rounded-DEFAULT border border-border bg-surfaceSubtle shadow-xs overflow-hidden flex items-center justify-center text-center group-hover:border-primary/40 transition-colors">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={photoAlt || name}
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="px-ds-2 py-1 flex flex-col items-center justify-center text-muted text-[0.7rem] leading-tight select-none">
                <svg
                  className="w-6 h-6 mb-1 opacity-40 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                <span>No Photo</span>
              </div>
            )}
          </div>

          {/* Details & Meta */}
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-start justify-between gap-ds-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-ds-2 flex-wrap">
                  {squadNumber !== undefined && (
                    <span
                      className="inline-flex items-center justify-center min-w-[1.8em] px-ds-1.5 py-0.5 rounded-sm bg-rail text-rail-foreground font-mono tabular-nums font-bold text-xs shrink-0 select-none border border-rail-line shadow-xs"
                      title={`Squad Number ${squadNumber}`}
                    >
                      #{squadNumber}
                    </span>
                  )}
                  <h3 className="text-base font-bold text-foreground leading-tight tracking-tight m-0 truncate">
                    {name}
                  </h3>
                </div>

                {legalName && (
                  <p className="text-xs text-muted-foreground m-0 mt-0.5 font-sans">
                    Legal: {legalName}
                  </p>
                )}

                {position && (
                  <p className="text-xs font-medium text-muted m-0 mt-1 font-sans">
                    {position}
                  </p>
                )}
              </div>

              {statusPill && <div className="shrink-0">{statusPill}</div>}
            </div>

            {/* Performance Stats */}
            {stats.length > 0 && (
              <div className="mt-ds-3 pt-ds-3 border-t border-border flex items-baseline gap-ds-4 flex-wrap">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className="font-mono tabular-nums text-lg font-bold text-foreground leading-none">
                      {stat.value}
                    </span>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-muted mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {children}

        {actions && (
          <div className="mt-ds-3 pt-ds-3 border-t border-border flex items-center justify-end gap-ds-2">
            {actions}
          </div>
        )}
      </div>
    );
  }
);

PlayerCard.displayName = 'PlayerCard';
