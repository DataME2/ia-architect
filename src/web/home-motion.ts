/**
 * The front door's motion as numbers (scope 120, reworked in scope 122). It
 * covers how far through its scroll a section is, which role page that
 * progress reaches, where the marker sits on the study's contents index,
 * and how far each page has wiped in.
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
 * Where the marker sits on the study's contents index, as a fraction of the
 * index's height. The first station is half a row from the top and the last
 * half a row from the bottom, so the marker lines up with the row it names.
 */
export function indexPosition(t: number, n: number): number {
  return n > 0 ? (0.5 + clamp01(t) * (n - 1)) / n : 0;
}

/**
 * How much of page `i` of `n` is shown at progress `p`, from 0 to 1. The
 * first page is always shown. Each later page wipes in over the one before
 * it, within a short band (`band`, in pages) centred where the nearest
 * station changes. A page holds still for most of its stretch of scroll,
 * and the page being read is always the one `stationAt` names.
 */
export function pageReveal(p: number, i: number, n: number, band = 0.3): number {
  if (i <= 0) return 1;
  if (n <= 1) return 0;
  const s = clamp01(p) * (n - 1);
  return clamp01((s - (i - 0.5)) / band + 0.5);
}

/** A progress as a whole percentage, for a readout. */
export const percent = (p: number): number => Math.round(clamp01(p) * 100);
