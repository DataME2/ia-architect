import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Field label text or element.
   */
  label?: React.ReactNode;
  /**
   * Helper or hint text displayed below the field.
   */
  hint?: React.ReactNode;
  /**
   * Error message displayed below the field. Sets aria-invalid and error styling.
   */
  error?: React.ReactNode;
  /**
   * Element or icon placed inside input on the left.
   */
  leftIcon?: React.ReactNode;
  /**
   * Element or icon placed inside input on the right.
   */
  rightIcon?: React.ReactNode;
  /**
   * Whether input stretches to full container width.
   * @default true
   */
  fullWidth?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      required,
      disabled,
      className,
      id: providedId,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = providedId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    const describedBy = [
      hint ? hintId : null,
      error ? errorId : null,
      props['aria-describedby'],
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const hasError = Boolean(error);

    return (
      <div className={cn('flex flex-col gap-ds-1 font-sans', fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'text-sm font-semibold text-foreground select-none flex items-center gap-ds-1',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <span>{label}</span>
            {required && <span className="text-destructive-indicator" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-ds-3 flex items-center justify-center text-muted pointer-events-none shrink-0">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full min-h-[44px] px-ds-3 py-ds-2 bg-surface text-foreground placeholder:text-muted-foreground/70 font-sans text-sm rounded-sm border transition-all duration-180 ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:border-primary',
              leftIcon ? 'pl-ds-6' : '',
              rightIcon ? 'pr-ds-6' : '',
              hasError
                ? 'border-destructive-indicator bg-destructive/10 text-destructive-foreground focus-visible:ring-destructive-indicator'
                : 'border-border-strong hover:border-primary',
              disabled && 'bg-backgroundSunk text-muted cursor-not-allowed border-border hover:border-border opacity-70',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-ds-3 flex items-center justify-center text-muted pointer-events-none shrink-0">
              {rightIcon}
            </div>
          )}
        </div>

        {hint && !hasError && (
          <p id={hintId} className="text-xs text-muted leading-tight mt-0.5">
            {hint}
          </p>
        )}

        {hasError && (
          <p id={errorId} role="alert" className="text-xs font-semibold text-destructive-foreground leading-tight mt-0.5 flex items-center gap-ds-1">
            <svg className="w-3.5 h-3.5 shrink-0 text-destructive-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

TextField.displayName = 'TextField';