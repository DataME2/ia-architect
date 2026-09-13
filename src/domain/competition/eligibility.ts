/**
 * BR8 — does this official's classification meet the competition's minimum?
 *
 * Until the catalogue existed this question had no answer, and
 * `conflicts.ts` said so in a comment: *"It compares a classification
 * against the competition's minimum, and no competition record exists.
 * What can be said is that there is nothing to compare."* A referee with no
 * classification produced a warning; a referee **below** the minimum
 * produced nothing at all.
 *
 * Four outcomes, not two, because "cannot judge" is a real answer and
 * collapsing it into either "fine" or "refused" would be a lie in one
 * direction or the other.
 */
import type { ClassificationLevel } from './types.ts';

export type ClassificationVerdict =
  /** At or above the minimum. */
  | { readonly kind: 'meets' }
  /** Below it — BR8 refuses the designation, and the message says by how much. */
  | { readonly kind: 'below'; readonly held: string; readonly required: string }
  /** The competition states no minimum (#78: a friendly has no competition). */
  | { readonly kind: 'no-minimum' }
  /** Nothing to compare: no classification held, or it is not catalogued. */
  | { readonly kind: 'unknown'; readonly why: string };

export function classificationVerdict(
  held: ClassificationLevel | null,
  /** Free text the club typed before the catalogue existed, if any. */
  heldFreeText: string | null,
  minimum: ClassificationLevel | null,
): ClassificationVerdict {
  if (minimum === null) return { kind: 'no-minimum' };

  if (held === null) {
    return {
      kind: 'unknown',
      why: heldFreeText === null
        ? 'No classification recorded, so eligibility cannot be judged.'
        // The club has an answer; it just is not one this can compare.
        // Saying that is more useful than pretending there is nothing.
        : `Classification "${heldFreeText}" is not in the catalogue, so it cannot be compared with ${minimum.name}.`,
    };
  }

  // BR135. Ranks from different associations are not comparable, and a
  // comparison that ignores this would be arithmetic on unrelated scales.
  if (held.associationId !== minimum.associationId) {
    return {
      kind: 'unknown',
      why: `Their classification is from a different association, so it cannot be compared with ${minimum.name}.`,
    };
  }

  return held.rank >= minimum.rank
    ? { kind: 'meets' }
    : { kind: 'below', held: held.name, required: minimum.name };
}
