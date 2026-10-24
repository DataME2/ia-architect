import * as React from 'react';
import { cn } from '@/lib/utils';
import { BALL_RADIUS } from '../../web/brand-mark.ts';

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

/**
 * The tile and the pitch (scope 108): touchline, halfway line, centre circle
 * and both boxes, in white on pitch blue, with faint mowing stripes that say
 * grass at large sizes and vanish small. Draws in a 32-unit box.
 *
 * The ids repeat when two marks share a page; their definitions are
 * identical, so whichever one a reference finds draws the same.
 */
export function MarkPitch() {
  return (
    <>
      <defs>
        <linearGradient id="pp-mark-tile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#234a66" />
          <stop offset="1" stopColor="#0b1b27" />
        </linearGradient>
        <radialGradient id="pp-mark-leather" cx="-0.35" cy="-0.4" r="1.55" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#eef2f6" />
          <stop offset="1" stopColor="#b9c5d3" />
        </radialGradient>
        <radialGradient id="pp-mark-shade" cx="-0.3" cy="-0.35" r="1.45" gradientUnits="userSpaceOnUse">
          <stop offset="0.55" stopColor="#0b1b27" stopOpacity="0" />
          <stop offset="1" stopColor="#0b1b27" stopOpacity="0.38" />
        </radialGradient>
        <clipPath id="pp-mark-ball">
          <circle r="1" />
        </clipPath>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#pp-mark-tile)" />
      <g fill="#ffffff" opacity="0.045">
        <rect x="7.6" y="8" width="2.75" height="16" />
        <rect x="13.1" y="8" width="2.75" height="16" />
        <rect x="18.6" y="8" width="2.75" height="16" />
        <rect x="24.1" y="8" width="2.75" height="16" />
      </g>
      <g fill="none" stroke="#ffffff" strokeOpacity="0.58" strokeWidth="0.9">
        <rect x="5" y="8" width="22" height="16" rx="1.5" />
        <line x1="16" y1="8" x2="16" y2="24" />
        <circle cx="16" cy="16" r="3.4" />
        <rect x="5" y="12" width="3.4" height="8" />
        <rect x="23.6" y="12" width="3.4" height="8" />
      </g>
    </>
  );
}

/**
 * A 32-panel football seen face on, on a unit circle: one pentagon in the
 * middle, five at the rim, and the seams that draw the hexagons between.
 * Light falls from the top left and stays put; `spin` goes inside the
 * panels' group, so only the panels turn as the ball rolls.
 */
export function Football({ spin }: { readonly spin?: React.ReactNode }) {
  const ink = '#13222e';
  return (
    <>
      <circle r="1" fill="url(#pp-mark-leather)" />
      <g>
        <g clipPath="url(#pp-mark-ball)">
          <path fill={ink} d="M0 -0.36L0.342 -0.111L0.212 0.291L-0.212 0.291L-0.342 -0.111Z" />
          <path
            fill={ink}
            d="M0 -0.62L-0.342 -0.869L-0.212 -1.271L0.212 -1.271L0.342 -0.869ZM0.59 -0.192L0.72 -0.594L1.144 -0.594L1.274 -0.192L0.932 0.057ZM0.364 0.502L0.788 0.502L0.918 0.904L0.576 1.153L0.234 0.904ZM-0.364 0.502L-0.234 0.904L-0.576 1.153L-0.918 0.904L-0.788 0.502ZM-0.59 -0.192L-0.932 0.057L-1.274 -0.192L-1.144 -0.594L-0.72 -0.594Z"
          />
          <path
            fill="none"
            stroke={ink}
            strokeWidth="0.07"
            strokeLinecap="round"
            d="M0 -0.36L0 -0.62M0.342 -0.869L0.72 -0.594M0.531 -0.731L0.617 -0.849M0.342 -0.111L0.59 -0.192M0.932 0.057L0.788 0.502M0.86 0.279L0.999 0.324M0.212 0.291L0.364 0.502M0.234 0.904L-0.234 0.904M0 0.904L0 1.05M-0.212 0.291L-0.364 0.502M-0.788 0.502L-0.932 0.057M-0.86 0.279L-0.999 0.324M-0.342 -0.111L-0.59 -0.192M-0.72 -0.594L-0.342 -0.869M-0.531 -0.731L-0.617 -0.849"
          />
        </g>
        {spin}
      </g>
      <circle r="1" fill="url(#pp-mark-shade)" />
      <circle r="1" fill="none" stroke="#0b1b27" strokeWidth="0.06" />
    </>
  );
}

/** The still mark: the pitch, and the ball on the centre spot at kick-off. */
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
        <MarkPitch />
        <g transform={`translate(16 16) scale(${BALL_RADIUS})`}>
          <Football />
        </g>
      </svg>
    );
  }
);

BrandMark.displayName = 'BrandMark';
