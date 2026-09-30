import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Primary label text or element.
   */
  label?: React.ReactNode;
  /**
   * Secondary description or contextual note text.
   */
  description?: React.ReactNode;
  /**
   * Validation error message displayed below the control.
   */
  error?: React.ReactNode;
  /**
   * Sets indeterminate check state visually and programmatically.
   */
  indeterminate?: boolean;
}

export const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  (
    {
      label,
      description,
      error,
      indeterminate = false,
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

    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

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
            'group flex items-start gap-ds-3 p-ds-3 rounded-sm min-h-[44px] transition-colors duration-180 ease-in-out cursor-pointer hover:bg-surfaceSubtle select-none border border-transparent',
            disabled && 'opacity-60 cursor-not-allowed hover:bg-transparent',
            hasError && 'bg-destructive/10 border-destructive-indicator/40'
          )}
        >
          <div className="relative flex items-center justify-center shrink-0 mt-0.5">
            <input
              ref={inputRef}
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
                'indeterminate:bg-primary indeterminate:border-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                'hover:border-primary',
                disabled && 'cursor-not-allowed bg-backgroundSunk border-border peer-checked:bg-muted peer-checked:border-muted',
                hasError && 'border-destructive-indicator'
              )}
              {...props}
            />
            {/* Custom Check Icon */}
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
            {/* Custom Indeterminate Icon */}
            <svg
              className="absolute w-3.5 h-3.5 text-primary-foreground pointer-events-none opacity-0 peer-indeterminate:opacity-100 transition-opacity duration-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            {label && (
              <span className="text-sm font-semibold text-foreground leading-snug flex items-center gap-ds-1">
                <span>{label}</span>
                {required && <span className="text-destructive-indicator" aria-hidden="true">*</span>}
              </span>
            )}
            {description && (
              <span id={descriptionId} className="text-xs text-muted leading-relaxed mt-0.5">
                {description}
              </span>
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

CheckboxField.displayName = 'CheckboxField';