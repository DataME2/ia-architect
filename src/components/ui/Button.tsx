import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant of the button.
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  /**
   * Sizing option controlling height, padding, and font size.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Shows a loading spinner and disables interaction.
   */
  isLoading?: boolean;
  /**
   * Text to display while in loading state.
   */
  loadingText?: string;
  /**
   * Element or icon displayed before button label.
   */
  leftIcon?: React.ReactNode;
  /**
   * Element or icon displayed after button label.
   */
  rightIcon?: React.ReactNode;
  /**
   * Expands button width to 100% of container.
   */
  fullWidth?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover border-transparent shadow-xs',
  secondary:
    'bg-secondary text-secondary-foreground border-border-strong hover:bg-surfaceSubtle hover:border-teal hover:text-teal-foreground shadow-xs',
  ghost:
    'bg-transparent text-foreground border-transparent hover:bg-primary-soft hover:text-primary shadow-none',
  destructive:
    'bg-surface text-destructive-foreground border-destructive-indicator hover:bg-destructive shadow-xs',
  outline:
    'bg-transparent text-foreground border-border hover:bg-surfaceSubtle hover:border-primary shadow-xs',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[36px] px-ds-3 py-ds-1 text-xs gap-ds-2',
  md: 'min-h-[44px] px-ds-4 py-ds-2 text-sm font-semibold gap-ds-2',
  lg: 'min-h-[48px] px-ds-5 py-ds-3 text-base font-semibold gap-ds-3',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'inline-flex items-center justify-center font-sans border rounded-sm transition-all duration-180 ease-in-out cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'active:translate-y-[1px]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:shadow-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children && <span>{isLoading && loadingText ? loadingText : children}</span>}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';