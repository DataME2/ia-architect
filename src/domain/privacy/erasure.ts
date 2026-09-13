/**
 * The answer to "will you delete my child's data?" (BR49).
 *
 * Two outcomes and no third
 * ([decision 13](../../../docs/decisions/13_erasure_is_all_or_nothing.md)):
 * honoured, or refused **naming every basis that bound it**. Partial
 * redaction is not a third outcome — a blanked row still joins to a team
 * sheet, and calling that erasure is a claim this platform cannot support.
 *
 * Pure, because a refusal has to be *explainable*. A parent reads the
 * reason, so the reason is a value this module produces rather than
 * something that emerges from whichever query happened to run.
 */
import type { IsoDate } from '../types.ts';
import type { RetentionBasis, RetentionBasisKind } from './types.ts';

export type ErasureVerdict =
  | { readonly erase: true }
  | {
      readonly erase: false;
      readonly bases: readonly RetentionBasis[];
      /**
       * The date the last binding basis lapses, or `null` when one of them
       * never does.
       *
       * Null rather than a far-future date on purpose: there is no day on
       * which an indefinitely-retained record becomes erasable, and
       * offering one would be a lie of arithmetic.
       */
      readonly honourableFrom: IsoDate | null;
    };

export function bindingBases(
  bases: readonly RetentionBasis[],
  asAt: IsoDate,
): readonly RetentionBasis[] {
  return bases.filter((b) => b.expiresOn === null || b.expiresOn >= asAt);
}

export function erasureVerdict(bases: readonly RetentionBasis[], asAt: IsoDate): ErasureVerdict {
  const binding = bindingBases(bases, asAt);
  if (binding.length === 0) return { erase: true };

  const indefinite = binding.some((b) => b.expiresOn === null);
  const latest = binding
    .map((b) => b.expiresOn)
    .filter((d): d is IsoDate => d !== null)
    .sort()
    .at(-1) ?? null;

  return { erase: false, bases: binding, honourableFrom: indefinite ? null : latest };
}

/** What each basis is called where a parent will read it, not a lawyer. */
const BASIS_WORDS: Readonly<Record<RetentionBasisKind, string>> = {
  statutory_financial: 'the club must keep its financial records',
  child_safety: 'child-safety records must be kept',
  active_eligibility: 'there is a current registration the governing body relies on',
  life_member: 'the club holds this person as a life member, permanently',
  legal_hold: 'the records are subject to a legal hold',
};

/**
 * The refusal, in words.
 *
 * Written here rather than in a component because it is the *answer*, not
 * its presentation — and because a sentence a parent has to accept should
 * be reviewed in a diff rather than discovered in a screenshot.
 */
export function explainRefusal(verdict: ErasureVerdict): string {
  if (verdict.erase) return 'There is nothing requiring this record to be kept.';

  const reasons = verdict.bases.map((b) => {
    const words = BASIS_WORDS[b.basis];
    return b.expiresOn === null ? `${words} (with no end date)` : `${words} (until ${b.expiresOn})`;
  });

  const list = reasons.length === 1
    ? reasons[0]
    : `${reasons.slice(0, -1).join(', ')}, and ${reasons.at(-1)}`;

  return verdict.honourableFrom === null
    ? `This record cannot be erased: ${list}. There is no date on which that changes.`
    : `This record cannot be erased yet: ${list}. It can be erased from ${verdict.honourableFrom}.`;
}
