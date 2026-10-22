import * as React from 'react';
import { cn } from '@/lib/utils';

// `title` is omitted from the HTML attributes: here it is the heading's
// content (any node), not the element's tooltip string.
export interface HeroBannerProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /**
   * Uppercase tag or context label displayed above the main heading.
   */
  eyebrow?: React.ReactNode;
  /**
   * Main heading title for the hero section.
   */
  title: React.ReactNode;
  /**
   * Lede or subtext describing the workspace or landing action.
   */
  subtext?: React.ReactNode;
  /**
   * Primary and secondary hero action buttons or controls.
   */
  actions?: React.ReactNode;
  /**
   * Whether to display the decorative pitch marking circle in the background.
   * @default true
   */
  pitchDecoration?: boolean;
}

export const HeroBanner = React.forwardRef<HTMLElement, HeroBannerProps>(
  (
    {
      eyebrow,
      title,
      subtext,
      actions,
      pitchDecoration = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <section
        ref={ref}
        aria-roledescription="hero banner"
        className={cn(
          'relative overflow-hidden rounded-lg bg-(image:--hero-bg) text-hero-muted shadow-clay p-ds-5 sm:p-ds-6 md:p-ds-7 mb-ds-6 select-none font-sans',
          className
        )}
        {...props}
      >
        {/* Decorative Pitch Marking Circle */}
        {pitchDecoration && (
          <div
            className="absolute -right-24 -bottom-56 w-[26rem] h-[26rem] rounded-full border-[1.5px] border-hero-accent/20 pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl flex flex-col items-start">
          {eyebrow && (
            <span className="font-sans font-bold text-xs uppercase tracking-widest text-hero-accent mb-ds-2">
              {eyebrow}
            </span>
          )}

          {typeof title === 'string' ? (
            <h2 className="font-sans font-bold text-2xl sm:text-3xl md:text-4xl text-hero-text tracking-tight leading-tight mb-ds-3 max-w-xl">
              {title}
            </h2>
          ) : (
            <div className="mb-ds-3">{title}</div>
          )}

          {subtext && (
            <p className="font-sans text-sm sm:text-base text-hero-muted max-w-xl mb-ds-5 leading-normal m-0">
              {subtext}
            </p>
          )}

          {actions && (
            <div className="flex flex-wrap items-center gap-ds-3">
              {actions}
            </div>
          )}

          {children}
        </div>
      </section>
    );
  }
);

HeroBanner.displayName = 'HeroBanner';