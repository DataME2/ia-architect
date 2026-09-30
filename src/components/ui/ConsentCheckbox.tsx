'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ConsentCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Consent agreement text or detailed legal notice label.
   */
  label: React.ReactNode;
  /**
   * Additional detailed legal or privacy disclosure text.
   */
  description?: React.ReactNode;
  /**
   * Validation error message displayed when consent is mandatory but unchecked.
   */
  error?: React.ReactNode;
}

export const ConsentCheckbox = React.forwardRef<HTMLInputElement, ConsentCheckboxProps>(
  (
    {
      label,
      description,
      error,
      disabled,
      required,
      className,
      id: providedId,
      checked,
      defaultChecked,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const id = providedId || generatedId;
    const descriptionId = `${id}-desc`;
    const errorId = `${id}-error`;

    const hasError = Boolean(error);
    const describedBy = [
      description ? descriptionId : null,
      error ? errorId : null,
      props['aria-describedby'],
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-ds-1 font-sans', className)}>
        <label
          htmlFor={id}
          className={cn(
            'flex items-start gap-ds-3 p-ds-3 rounded-sm border bg-surface transition-colors duration-180 ease-in-out cursor-pointer hover:bg-surfaceSubtle select-none min-h-[44px]',
            hasError
              ? 'border-destructive-indicator bg-destructive/10'
              : 'border-border hover:border-primary',
            disabled && 'bg-backgroundSunk border-border opacity-70 cursor-not-allowed hover:bg-backgroundSunk'
          )}
        >
          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              checked={checked}
              defaultChecked={defaultChecked}
              disabled={disabled}
              required={required}
              onChange={onChange}
              aria-invalid={hasError || undefined}
              aria-describedby={describedBy}
              className={cn(
                'peer appearance-none w-5 h-5 rounded-sm border border-border-strong bg-surface transition-all duration-180 ease-in-out cursor-pointer',
                'checked:bg-primary checked:border-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'hover:border-primary',
                disabled && 'cursor-not-allowed bg-backgroundSunk border-border peer-checked:bg-muted peer-checked:border-muted',
                hasError && 'border-destructive-indicator'
              )}
              {...props}
            />
            <svg
              className="absolute w-3.5 h-3.5 text-primary-foreground pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity duration-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex flex-col flex-1 min-w-0 text-sm leading-relaxed text-muted">
            <div className="text-foreground font-normal">
              {label}
              {required && <span className="text-destructive-indicator ml-ds-1" aria-hidden="true">*</span>}
            </div>
            {description && (
              <div id={descriptionId} className="text-xs text-muted-foreground mt-ds-1">
                {description}
              </div>
            )}
          </div>
        </label>

        {hasError && (
          <p id={errorId} role="alert" className="text-xs font-semibold text-destructive-foreground leading-tight px-ds-3 flex items-center gap-ds-1">
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

ConsentCheckbox.displayName = 'ConsentCheckbox';