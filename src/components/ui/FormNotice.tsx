import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FormFieldsetProps
  extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  /**
   * Title text or element for fieldset legend.
   */
  legend?: React.ReactNode;
  /**
   * Section hint or introductory explanation text.
   */
  description?: React.ReactNode;
  /**
   * Fieldset group level error message.
   */
  error?: React.ReactNode;
}

export const FormFieldset = React.forwardRef<HTMLFieldSetElement, FormFieldsetProps>(
  (
    {
      legend,
      description,
      error,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <fieldset
        ref={ref}
        disabled={disabled}
        className={cn(
          'bg-surface border border-border rounded-DEFAULT p-ds-4 md:p-ds-5 shadow-xs transition-colors duration-180 font-sans',
          disabled && 'opacity-70 bg-backgroundSunk',
          className
        )}
        {...props}
      >
        {legend && (
          <legend className="font-semibold text-base text-foreground px-ds-2 -ml-ds-2 select-none">
            {legend}
          </legend>
        )}

        {description && (
          <p className="text-xs text-muted leading-relaxed mb-ds-4 -mt-ds-1">
            {description}
          </p>
        )}

        {error && (
          <div role="alert" className="p-ds-3 mb-ds-4 rounded-sm bg-destructive/10 border border-destructive-indicator/30 text-xs font-semibold text-destructive-foreground flex items-center gap-ds-2">
            <svg className="w-4 h-4 shrink-0 text-destructive-indicator" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-ds-4">
          {children}
        </div>
      </fieldset>
    );
  }
);

FormFieldset.displayName = 'FormFieldset';