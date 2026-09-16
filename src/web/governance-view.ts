/**
 * The governance screen's decisions. Pure.
 */
import type {
  CommitteeResolution,
  CommitteePosition,
  TermStatus,
  VoucherProgramEnablement,
} from '../domain/governance/term.ts';
import type { IsoDate } from '../domain/types.ts';
import { parseDueDate } from './plan-view.ts';

export const POSITION_LABEL: Readonly<Record<CommitteePosition, string>> = {
  president: 'President',
  'vice-president': 'Vice-president',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  registrar: 'Registrar',
  'committee-member': 'Committee member',
  'subcommittee-member': 'Subcommittee member',
};

export const TERM_STATUS_LABEL: Readonly<Record<TermStatus, string>> = {
  'not-yet-started': 'Not yet started',
  current: 'Current',
  'due-soon': 'AGM due soon',
  overdue: 'AGM overdue',
};

export const TERM_STATUS_TONE: Readonly<Record<TermStatus, string>> = {
  'not-yet-started': 'pill',
  current: 'pill pill-ok',
  'due-soon': 'pill pill-warn',
  overdue: 'pill pill-stop',
};

/**
 * What to say about a term, in one line.
 *
 * An overdue mandate leads, because it is the only one of these that is a
 * thing to do rather than a thing to know — and because other rules rest on
 * Committee authority (BR21), so "who approved this" has no clean answer
 * while the term that would have answered it has lapsed.
 */
export function termNote(status: TermStatus, days: number): string {
  switch (status) {
    case 'overdue':
      return `The AGM was due ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. This committee is still governing, but its mandate has not been renewed — and approvals that rest on Committee authority (BR21) now rest on an expired term.`;
    case 'due-soon':
      return `The AGM falls due in ${days} day${days === 1 ? '' : 's'}. Time to call the meeting.`;
    case 'not-yet-started':
      return 'This term has not begun yet.';
    case 'current':
      return `The AGM falls due in ${days} days.`;
  }
}

export const RESOLUTION_CATEGORY_LABEL: Readonly<Record<CommitteeResolution['category'], string>> = {
  general: 'General',
  voucher_program: 'Voucher Program approval',
};

export type ParsedResolution =
  | {
      readonly ok: true;
      readonly termId: string;
      readonly decidedOn: IsoDate;
      readonly summary: string;
      readonly movedByPersonId: string | null;
      readonly category: CommitteeResolution['category'];
    }
  | { readonly ok: false; readonly error: string };

/**
 * BR123's form. `summary` is what makes this a resolution rather than a
 * date with a category attached — a club minuting "the Committee decided
 * something" has decided nothing worth a record.
 */
export function parseResolution(fields: {
  readonly termId: string;
  readonly decidedOn: string;
  readonly summary: string;
  readonly movedByPersonId: string;
  readonly category: string;
}): ParsedResolution {
  if (fields.termId === '') return { ok: false, error: 'Choose which Committee Term this belongs to.' };

  const decidedOn = parseDueDate(fields.decidedOn);
  if (decidedOn === null) return { ok: false, error: 'Enter the decision date as a real calendar date.' };

  const summary = fields.summary.trim();
  if (summary === '') return { ok: false, error: 'Say what the Committee decided.' };

  const category = fields.category === 'voucher_program' ? 'voucher_program' : 'general';

  return {
    ok: true,
    termId: fields.termId,
    decidedOn,
    summary,
    movedByPersonId: fields.movedByPersonId === '' ? null : fields.movedByPersonId,
    category,
  };
}

export type ParsedEnablement =
  | { readonly ok: true; readonly program: string; readonly resolutionId: string }
  | { readonly ok: false; readonly error: string };

/**
 * BR21's form: naming the Voucher Program and the resolution that approved
 * it. Which resolutions are offered is the screen's job (only
 * `voucher_program`-category ones); this only refuses what typing a program
 * name wrong or leaving the resolution unchosen would otherwise let through.
 */
export function parseEnablement(fields: {
  readonly program: string;
  readonly resolutionId: string;
}): ParsedEnablement {
  const program = fields.program.trim();
  if (program === '') return { ok: false, error: 'Name the Voucher Program.' };
  if (fields.resolutionId === '') {
    return { ok: false, error: 'Choose the resolution that approved this Voucher Program.' };
  }
  return { ok: true, program, resolutionId: fields.resolutionId };
}

/**
 * The programs a club has already enabled, trimmed and lower-cased the same
 * way the database's own gate compares them (`assert_voucher_program_is_enabled`)
 * — so a screen never claims a program is new when a club only typed its
 * name differently the second time.
 */
export function enabledProgramNames(
  enablements: readonly VoucherProgramEnablement[],
): ReadonlySet<string> {
  return new Set(enablements.map((e) => e.program.trim().toLowerCase()));
}
