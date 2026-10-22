import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BrandMarkProps extends React.SVGProps<SVGSVGElement> {
  /**
   * Sizing option for the brand mark square badge.
   * - `sm`: 24px x 24px
   * - `md`: 32px x 32px
   * - `lg`: 48px x 48px
   * Or pass a custom numeric pixel value.
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | number;
  /**
   * Accessible text label for screen readers.
   * @default "PitchPeople"
   */
  label?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export const BrandMark = React.forwardRef<SVGSVGElement, BrandMarkProps>(
  ({ size = 'md', label = "PitchPeople", className, ...props }, ref) => {
    const dimension = typeof size === 'number' ? size : sizeMap[size] || 32;

    return (
      <svg
        ref={ref}
        width={dimension}
        height={dimension}
        viewBox="0 0 32 32"
        role="img"
        aria-label={label}
        focusable="false"
        className={cn('shrink-0 select-none inline-block align-middle', className)}
        {...props}
      >
        <defs>
          <linearGradient id="ldt-brand-mark-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: 'var(--night-3)' }} />
            <stop offset="1" style={{ stopColor: 'var(--night)' }} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#ldt-brand-mark-grad)" />
        <circle
          cx="16"
          cy="16"
          r="9.6"
          strokeWidth="1.3"
          style={{ fill: 'var(--flood)', stroke: 'var(--aurora-cyan)' }}
        />
        <path d="M16 10.1 21.61 14.18 19.47 20.77h-6.94L10.39 14.18Z" style={{ fill: 'var(--night)' }} />
      </svg>
    );
  }
);

BrandMark.displayName = 'BrandMark';