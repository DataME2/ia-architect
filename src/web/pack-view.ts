/**
 * The submission-pack screens, as logic rather than as markup.
 *
 * Pure. Decides how the exclusion list reads, what a pack's records add up
 * to, and what a downloaded file is called.
 */
import type { ExclusionReason, SubmissionPack } from '../domain/submission/types.ts';
import type { SubmissionStateRow } from '../data/schema.ts';

export interface ExclusionGroup {
  readonly reason: ExclusionReason;
  readonly label: string;
  readonly count: number;
  readonly personIds: readonly string[];
}

const EXCLUSION_LABEL: Record<ExclusionReason, string> = {
  'validation-failed': 'Blocked by a rule',
  'unresolved-duplicate': 'Possible duplicate not yet resolved',
  'wrong-club': 'Belongs to another club',
  'wrong-season': 'Registered for another season',
};

/** Most-common reason first — that is the one worth fixing in bulk. */
export function exclusionSummary(pack: SubmissionPack): readonly ExclusionGroup[] {
  const groups = new Map<ExclusionReason, string[]>();
  for (const excluded of pack.excluded) {
    const list = groups.get(excluded.reason) ?? [];
    list.push(excluded.personId);
    groups.set(excluded.reason, list);
  }

  return [...groups.entries()]
    .map(([reason, personIds]) => ({
      reason,
      label: EXCLUSION_LABEL[reason],
      count: personIds.length,
      personIds,
    }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
}

export interface RecordStateSummary {
  readonly sent: number;
  readonly confirmed: number;
  readonly rejected: number;
}

/**
 * What a handed-over pack has come back as.
 *
 * `sent` and `confirmed` are counted separately and never added together:
 * under BR60 only the second means the player may take the field, and a
 * single "submitted" number would hide exactly that difference.
 */
export function recordStateSummary(
  records: readonly { readonly state: SubmissionStateRow }[],
): RecordStateSummary {
  let sent = 0;
  let confirmed = 0;
  let rejected = 0;
  for (const record of records) {
    if (record.state === 'sent') sent += 1;
    else if (record.state === 'confirmed_present') confirmed += 1;
    else rejected += 1;
  }
  return { sent, confirmed, rejected };
}

/** Whether this pack is worth handing over at all. */
export function canHandOver(pack: {
  readonly rowCount: number;
  readonly handedOverAt: string | null;
}): boolean {
  return pack.rowCount > 0 && pack.handedOverAt === null;
}

/**
 * Reduce a name to something safe inside a filename.
 *
 * Strips path separators and anything a shell or a Windows filename would
 * object to, rather than trusting a club name to be tame — "St. Mary's / U12"
 * is an ordinary club name and a hostile filename.
 */
function slug(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'club'
  );
}

/**
 * What a downloaded pack is called.
 *
 * The version is in the name deliberately: the registrar will have several
 * of these in a downloads folder, and BR58's whole point is that version 2
 * is a different artifact from version 1 rather than a corrected copy of it.
 */
export function packFileName(
  clubName: string,
  seasonName: string,
  version: number,
  kind: 'pack' | 'exclusions',
): string {
  return `${slug(clubName)}-${slug(seasonName)}-v${version}-${kind}.csv`;
}
