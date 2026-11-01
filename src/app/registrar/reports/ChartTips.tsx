'use client';

import * as React from 'react';

/**
 * One tooltip for every chart inside it (scope 133). A mark carries its
 * text in `data-tip`, the value first and what it is second, separated by
 * `|`; the tooltip follows hover and keyboard focus alike. Text goes in as
 * text, never as markup: a team's name is data. Every value it shows is
 * also on the page, in a label or a table, so nothing hides behind a hover.
 */
export function ChartTips({ children }: { readonly children: React.ReactNode }) {
  const [tip, setTip] = React.useState<{ lines: string[]; x: number; y: number } | null>(null);

  const show = (target: EventTarget | null, x?: number, y?: number) => {
    const el = target instanceof Element ? target.closest<HTMLElement>('[data-tip]') : null;
    if (el === null) return setTip(null);
    const box = el.getBoundingClientRect();
    setTip({ lines: (el.dataset.tip ?? '').split('|'), x: x ?? box.left + box.width / 2, y: y ?? box.top });
  };

  return (
    <div
      className="fin-tips"
      onPointerMove={(e) => show(e.target, e.clientX, e.clientY)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => show(e.target)}
      onBlur={() => setTip(null)}
    >
      {children}
      {tip !== null && (
        <div className="fin-tip" role="status" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.lines[0]}</strong>
          {tip.lines.slice(1).map((line, i) => <span key={i}>{line}</span>)}
        </div>
      )}
    </div>
  );
}
