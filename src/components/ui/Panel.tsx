import * as React from 'react';
import { cn } from '@/lib/utils';

// `title` is the header's content (any node), not the HTML tooltip string.
export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Header title text or element.
   */
  title?: React.ReactNode;
  /**
   * Monospace metadata text or tag shown in header (e.g. timestamp, rule code, item count).
   */
  meta?: React.ReactNode;
  /**
   * Optional actions or status elements rendered on the right side of the panel header.
   */
  headerActions?: React.ReactNode;
  /**
   * Container background variant.
   * @default 'default'
   */
  variant?: 'default' | 'subtle' | 'sunken';
  /**
   * Applies dashed borders and hatched styling for placeholder or upcoming modules.
   * @default false
   */
  comingSoon?: boolean;
  /**
   * Tag label rendered in header when `comingSoon` is active.
   * @default 'IN DESIGN'
   */
  comingTag?: string;
  /**
   * Removes default padding from the panel body for edge-to-edge content like tables or lists.
   * @default false
   */
  noPadding?: boolean;
}

const variantStyles = {
  default: 'bg-surface border-border',
  subtle: 'bg-surfaceSubtle border-border',
  sunken: 'bg-backgroundSunk border-border/80',
};

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      title,
      meta,
      headerActions,
      variant = 'default',
      comingSoon = false,
      comingTag = 'IN DESIGN',
      noPadding = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const hasHeader = Boolean(title || meta || headerActions || comingSoon);

    return (
      <div
        ref={ref}
        className={cn(
          'rounded border font-sans text-foreground overflow-hidden shadow-xs transition-colors',
          comingSoon
            ? 'border-dashed border-border-strong bg-[repeating-linear-gradient(135deg,var(--color-surface,hsl(var(--surface)))_0_10px,rgba(230,220,205,0.45)_10px_11px)]'
            : variantStyles[variant],
          className
        )}
        {...props}
      >
        {hasHeader && (
          <div
            className={cn(
              'px-ds-4 py-2.5 border-b flex items-center justify-between gap-ds-3',
              comingSoon
                ? 'bg-transparent border-dashed border-border-strong'
                : 'bg-surfaceSubtle border-border'
            )}
          >
            <div className="flex items-center gap-ds-2 min-w-0">
              {title && (
                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-muted-foreground m-0 truncate">
                  {title}
                </h3>
              )}
              {meta && (
                <span className="font-mono text-[11px] text-muted-foreground/80 truncate">
                  {meta}
                </span>
              )}
            </div>

            <div className="flex items-center gap-ds-2 shrink-0">
              {comingSoon && (
                <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-border-strong bg-surface text-muted-foreground">
                  {comingTag}
                </span>
              )}
              {headerActions}
            </div>
          </div>
        )}

        <div className={cn('flex flex-col gap-ds-3', !noPadding && 'p-ds-4')}>
          {children}
        </div>
      </div>
    );
  }
);

Panel.displayName = 'Panel';

/* --- Compound Subcomponents --- */

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const PanelHeader = React.forwardRef<HTMLDivElement, PanelHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-ds-4 py-2.5 border-b border-border bg-surfaceSubtle flex items-center justify-between gap-ds-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
PanelHeader.displayName = 'PanelHeader';

export interface PanelTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const PanelTitle = React.forwardRef<HTMLHeadingElement, PanelTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'font-sans font-bold text-xs uppercase tracking-wider text-muted-foreground m-0',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);
PanelTitle.displayName = 'PanelTitle';

export interface PanelMetaProps extends React.HTMLAttributes<HTMLSpanElement> {}

export const PanelMeta = React.forwardRef<HTMLSpanElement, PanelMetaProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn('font-mono text-[11px] text-muted-foreground/80', className)}
      {...props}
    >
      {children}
    </span>
  )
);
PanelMeta.displayName = 'PanelMeta';

export interface PanelBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export const PanelBody = React.forwardRef<HTMLDivElement, PanelBodyProps>(
  ({ noPadding = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-ds-3', !noPadding && 'p-ds-4', className)}
      {...props}
    >
      {children}
    </div>
  )
);
PanelBody.displayName = 'PanelBody';