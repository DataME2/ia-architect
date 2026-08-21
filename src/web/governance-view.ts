/**
 * The governance screen's decisions. Pure.
 */
import type { CommitteePosition, TermStatus } from '../domain/governance/term.ts';

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
