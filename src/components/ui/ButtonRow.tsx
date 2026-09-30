import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Alignment of buttons within the container row.
   * @default 'start'
   */
  align?: 'start' | 'center' | 'end' | 'between';
  /**
   * Gap spacing between buttons.
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';
  /**
   * Whether the button row should allow buttons to wrap to a new line when constrained.
   * @default true
   */
  wrap?: boolean;
}

const alignClasses: Record<NonNullable<ButtonRowProps['align']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

const gapClasses: Record<NonNullable<ButtonRowProps['gap']>, string> = {
  sm: 'gap-ds-2',
  md: 'gap-ds-3',
  lg: 'gap-ds-4',
};

export const ButtonRow = React.forwardRef<HTMLDivElement, ButtonRowProps>(
  (
    {
      align = 'start',
      gap = 'md',
      wrap = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center',
          alignClasses[align],
          gapClasses[gap],
          wrap ? 'flex-wrap' : 'flex-nowrap',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ButtonRow.displayName = 'ButtonRow';