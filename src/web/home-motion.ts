/**
 * The front door's motion as numbers (scope 120). It covers how far
 * through its scroll a section is, which role station that progress
 * reaches, and where a point on the study's arc sits.
 *
 * Pure, so the page and the tests run the same functions, and a readout
 * can never disagree with the drawing it describes. Every progress value is
 * a number from 0 to 1.
 */

export const clamp01 = (n: number): number => (n > 1 ? 1 : n > 0 ? n : 0);

/**
 * Progress through a pinned section. It is 0 when the section's top reaches
 * `offset` (the bar's height), and 1 once its sticky stage has used the
 * whole runway. `top` is the section's top relative to the viewport, so
 * scrolling back reverses it.
 */
export function runwayProgress(top: number, sectionHeight: number, stageHeight: number, offset = 0): number {
  const runway = sectionHeight - stageHeight;
  return runway > 0 ? clamp01((offset - top) / runway) : 0;
}

/**
 * Progress as a section scrolls away under the bar, where nothing pins it:
 * 0 with its top at `offset`, 1 once it has risen by its own height.
 */
export function passProgress(top: number, height: number, offset = 0): number {
  return height > 0 ? clamp01((offset - top) / height) : 0;
}

/**
 * Progress as an element rises into view: 0 while its top is still below
 * the viewport, 1 once all of it is in view.
 */
export function enterProgress(top: number, height: number, viewport: number): number {
  return height > 0 ? clamp01((viewport - top) / height) : 0;
}

/** Where the i-th of n stations sits along a path, from 0 to 1. */
export function stationT(i: number, n: number): number {
  return n > 1 ? clamp01(i / (n - 1)) : 0;
}

/** The station nearest progress `p`, of n. */
export function stationAt(p: number, n: number): number {
  return n > 1 ? Math.round(clamp01(p) * (n - 1)) : 0;
}

/**
 * An arc of a circle, in SVG coordinates. Angles are in degrees, measured
 * clockwise from east, as SVG's y axis points down (270 is straight up).
 */
export interface Arc {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly from: number;
  readonly to: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The point a fraction `t` of the way along the arc. */
export function arcPoint(arc: Arc, t: number): { readonly x: number; readonly y: number } {
  const a = ((arc.from + (arc.to - arc.from) * clamp01(t)) * Math.PI) / 180;
  return { x: round2(arc.cx + arc.r * Math.cos(a)), y: round2(arc.cy + arc.r * Math.sin(a)) };
}

/** The arc as an SVG path, drawn from `from` to `to`. */
export function arcPath(arc: Arc): string {
  const a = arcPoint(arc, 0);
  const b = arcPoint(arc, 1);
  const large = Math.abs(arc.to - arc.from) > 180 ? 1 : 0;
  const sweep = arc.to > arc.from ? 1 : 0;
  return `M ${a.x} ${a.y} A ${arc.r} ${arc.r} 0 ${large} ${sweep} ${b.x} ${b.y}`;
}

/**
 * The study's arc. Eight stations fan across the top of a circle whose
 * centre is the person, as if seen from the halfway line. It is a diagram of
 * roles, not a drawing to scale, and it carries no measurement.
 */
export const STUDY_ARC: Arc = { cx: 320, cy: 360, r: 250, from: 196, to: 344 };

/** A progress as a whole percentage, for a readout. */
export const percent = (p: number): number => Math.round(clamp01(p) * 100);
