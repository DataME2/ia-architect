/**
 * The competition catalogue, as the domain sees it.
 *
 * Shared reference data rather than a club's own
 * ([decision 15](../../../docs/decisions/15_the_competition_catalogue_is_shared_reference_data.md)),
 * which matters here for one reason: BR8 compares a referee's
 * classification against **the competition's** minimum, so a per-club
 * minimum would make the same fixture eligible at one club and refused at
 * another.
 */

/**
 * A classification level, ranked within its association (BR135).
 *
 * The rank is what makes BR8 a comparison rather than a string match. It is
 * confined to one association because a Football Queensland Level 4 and
 * another body's Level 4 are not the same thing, and treating them as such
 * is a guess wearing the clothes of a calculation.
 */
export interface ClassificationLevel {
  readonly id: string;
  readonly associationId: string;
  readonly name: string;
  /** Higher is more senior. */
  readonly rank: number;
}

export interface Competition {
  readonly id: string;
  readonly associationId: string;
  readonly name: string;
  readonly tier: string | null;
  readonly playingFormat: string | null;
  /** BR8's floor, or `null` where the competition states none. */
  readonly minimum: ClassificationLevel | null;
}
