import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The public entrance: a dark identity rail and a workspace, for screens a
 * signed-out person sees (Figma "Sign-in — account-safe entry", node 33:4889).
 *
 * Presentational. Every colour is a token the design already used: the rail
 * is `--rail-bg`, the action `--accent`, the notices the destructive, success
 * and info pairs, so dark mode applies unchanged.
 */
export interface PublicEntranceNavItem {
  readonly label: string;
  readonly href: string;
  readonly current?: boolean;
}

export interface PublicEntranceProps {
  readonly nav: readonly PublicEntranceNavItem[];
  /** "Let'sDataTalk / Public" */
  readonly breadcrumb: string;
  /** "SIGNED OUT / PUBLIC / 9 OCT 2026" */
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: React.ReactNode;
  /** The footer's left note, e.g. "Public · no personal data". */
  readonly footerNote: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

const MONO = 'font-mono uppercase tracking-wider';

export function PublicEntrance({ nav, breadcrumb, eyebrow, title, lede, footerNote, children, className }: PublicEntranceProps) {
  return (
    <div
      className={cn(
        'font-sans flex flex-col md:flex-row items-stretch overflow-hidden rounded-lg border border-border-strong bg-background',
        className,
      )}
    >
      <aside
        aria-label="Public entrance"
        className="flex flex-col gap-ds-6 shrink-0 w-full md:w-60 px-ds-4 py-ds-6 bg-rail text-rail-foreground"
      >
        <p className="m-0 leading-snug">
          <span className="block text-[23px]">Let&rsquo;sDataTalk</span>
          <span className={cn('block text-[10px] text-rail-muted', MONO)}>Football / club workspace</span>
        </p>

        <div className="rounded-md bg-rail-line p-ds-4">
          <p className="m-0 text-sm">Public entrance</p>
          <p className={cn('m-0 mt-ds-3 text-[11px] text-rail-muted', MONO)}>No club context</p>
        </div>

        <div>
          <p className={cn('m-0 text-[10px] text-rail-muted', MONO)}>Account-safe public view</p>
          <p className="m-0 text-[15px] font-semibold">Signed out</p>
        </div>

        <nav aria-label="Public pages" className="flex flex-col gap-ds-2">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                // globals.css underlines every <a> and recolours it on hover.
                'flex items-center min-h-[44px] px-ds-3 rounded-sm text-[13px] no-underline transition-colors duration-180',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                item.current
                  ? 'bg-surface text-foreground hover:text-foreground'
                  : 'text-rail-muted hover:bg-rail-line hover:text-rail-foreground',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto border-t border-rail-line pt-ds-6 text-xs text-rail-muted">
          <p className="m-0 text-sm font-semibold text-rail-foreground">No identity assumed</p>
          <p className="m-0 mt-ds-3">Your invitation stays private.</p>
        </div>
      </aside>

      <div className="flex flex-1 min-w-0 flex-col">
        <div className="flex items-center min-h-[64px] px-ds-5 bg-surface border-b border-border">
          <p className="m-0 text-[13px] text-muted-foreground">{breadcrumb}</p>
        </div>

        <div className="flex flex-col gap-ds-5 p-ds-5 lg:p-ds-6">
          <header className="flex flex-col gap-ds-2">
            <p className={cn('m-0 text-[11px] text-muted-foreground', MONO)}>{eyebrow}</p>
            <h2 className="m-0 text-[28px] lg:text-[36px] font-bold leading-tight text-foreground">{title}</h2>
            <p className="m-0 text-[15px] text-muted-foreground">{lede}</p>
          </header>
          <div className="grid gap-ds-5 grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">{children}</div>
        </div>

        <p className={cn('m-0 mt-auto px-ds-5 pb-ds-5 text-[11px] text-muted', MONO)}>{footerNote}</p>
      </div>
    </div>
  );
}

/** A white card in the entrance's workspace, titled. */
export function EntranceCard({
  title,
  children,
  className,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-ds-4 p-ds-5 rounded-md border border-border bg-surface', className)}>
      <h3 className="m-0 text-xl font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

const CALLOUT_TONE = {
  info: 'bg-info text-info-foreground',
  error: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
} as const;

/** A titled notice: info, error or success. An error is announced at once. */
export function Callout({
  tone,
  title,
  children,
}: {
  readonly tone: keyof typeof CALLOUT_TONE;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div role={tone === 'error' ? 'alert' : undefined} className={cn('p-ds-4 rounded-sm', CALLOUT_TONE[tone])}>
      <p className="m-0 text-sm font-semibold leading-normal">{title}</p>
      <p className="m-0 text-[13px] leading-normal">{children}</p>
    </div>
  );
}

/** The dark statement panel: an eyebrow, a line, and what it means. */
export function BoundaryPanel({
  eyebrow,
  title,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="p-ds-5 rounded-lg bg-primary text-primary-foreground">
      <p className={cn('m-0 text-[11px] text-rail-muted', MONO)}>{eyebrow}</p>
      <p className="m-0 text-2xl leading-snug">{title}</p>
      <p className="m-0 text-[13px] text-rail-muted">{children}</p>
    </div>
  );
}
