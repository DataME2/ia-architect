'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Surface background and border visual style.
   * @default 'default'
   */
  variant?: 'default' | 'subtle' | 'sunken' | 'outline';
  /**
   * Visual padding density for the card container.
   * Set to 'none' when using compound subcomponents like CardContent/CardHeader.
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /**
   * Applies an interactive lift and drop-shadow animation on hover.
   * Automatically enabled if `href` or `onClick` is provided.
   * @default false
   */
  hoverEffect?: boolean;
  /**
   * Optional URL target. Renders the card as an anchor tag `<a>`.
   */
  href?: string;
  /**
   * Optional top accent border rail styling.
   */
  showRail?: boolean;
  /**
   * Rail color theme variant.
   * @default 'gold-reef'
   */
  railVariant?: 'gold-reef' | 'primary' | 'accent' | 'success' | 'destructive';
}

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-surface border-border shadow-xs',
  subtle: 'bg-surfaceSubtle border-border shadow-xs',
  sunken: 'bg-backgroundSunk border-border/80 shadow-none',
  outline: 'bg-transparent border-border-strong shadow-none',
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-ds-3',
  md: 'p-ds-4',
  lg: 'p-ds-5',
};

const railStyles: Record<NonNullable<CardProps['railVariant']>, string> = {
  'gold-reef': 'bg-gradient-to-r from-accent via-warning-indicator to-primary',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success-indicator',
  destructive: 'bg-destructive-indicator',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hoverEffect = false,
      href,
      showRail = false,
      railVariant = 'gold-reef',
      className,
      onClick,
      children,
      ...props
    },
    ref
  ) => {
    const isInteractive = Boolean(href || onClick || hoverEffect);
    const Component = href ? 'a' : 'div';

    return (
      <Component
        ref={ref as any}
        href={href}
        onClick={onClick}
        role={onClick && !href ? 'button' : undefined}
        tabIndex={onClick && !href ? 0 : undefined}
        className={cn(
          'relative overflow-hidden rounded border transition-all duration-180 flex flex-col justify-between text-foreground',
          variantStyles[variant],
          paddingStyles[padding],
          isInteractive &&
            'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          className
        )}
        {...(props as any)}
      >
        {showRail && (
          <div
            className={cn('absolute inset-x-0 top-0 h-[3px]', railStyles[railVariant])}
            aria-hidden="true"
          />
        )}
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

/* --- Compound Subcomponents --- */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Decreases bottom margin for compact layouts */
  compact?: boolean;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ compact = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-ds-1',
        compact ? 'mb-ds-2' : 'mb-ds-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level tag */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as: Tag = 'h3', className, children, ...props }, ref) => (
    <Tag
      ref={ref}
      className={cn(
        'font-sans text-base sm:text-lg font-semibold leading-tight text-foreground tracking-tight m-0',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('font-sans text-xs sm:text-sm text-muted-foreground leading-normal m-0', className)}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 font-sans text-sm text-foreground', className)} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mt-ds-4 pt-ds-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground gap-ds-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';