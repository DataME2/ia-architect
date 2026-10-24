/**
 * The dashboard's arithmetic (scope 106): a share for a progress bar, and
 * bar lengths for a distribution. Pure, so the figures a club reads are the
 * figures a test checked.
 */

/** A whole-number percentage, or null when there is nothing to divide. */
export function share(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export interface Bar {
  readonly label: string;
  readonly count: number;
  /** Length against the longest bar, 0–100. */
  readonly width: number;
}

/**
 * One bar per row, longest first, each measured against the longest. A row
 * counting nothing keeps a sliver rather than vanishing, so "none" still
 * reads as a row.
 */
export function bars(rows: readonly { readonly label: string; readonly count: number }[]): readonly Bar[] {
  const max = Math.max(0, ...rows.map((r) => r.count));
  return [...rows]
    .sort((a, b) => b.count - a.count)
    .map((r) => ({ ...r, width: max === 0 ? 2 : Math.max(2, Math.round((r.count / max) * 100)) }));
}
