'use client';

import * as React from 'react';

/**
 * A figure that counts up to its value when it first appears (scope 127).
 * The server renders the value itself, so without script, or under reduced
 * motion, the number is simply there. It never counts to anything but the
 * real value: it is motion, not a different number.
 */
export function CountUp({ value, suffix = '', ms = 800 }: { readonly value: number; readonly suffix?: string; readonly ms?: number }) {
  const [shown, setShown] = React.useState(value);

  React.useEffect(() => {
    if (value === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);

  return (
    <>
      {shown}
      {suffix}
    </>
  );
}
