/**
 * What the privacy screen decides.
 *
 * Pure, and the reason is sharper here than elsewhere: the screen's job is
 * to make an **irreversible** act obvious before somebody performs it. A
 * disposal list that quietly groups a life member in with the lapsed, or
 * counts a refused request as outstanding, would look completely fine in
 * review and would be found out by a club losing its own history.
 */
import type { RetentionState } from '../domain/privacy/retention.ts';

export const RETENTION_LABEL: Readonly<Record<RetentionState, string>> = {
  active: 'Still participating',
  lapsed: 'No longer participating',
  due_for_disposal: 'Past its retention period',
  life_member: 'Life member — kept permanently',
  contact_stale: 'Life member — contact details unconfirmed',
};

/**
 * The order the club should read them in.
 *
 * Disposal proposals first, because they are the only rows that ask for a
 * decision; stale life-member contacts next, because they are the only ones
 * that go stale on their own; everything else is context.
 */
const ORDER: Readonly<Record<RetentionState, number>> = {
  due_for_disposal: 0,
  contact_stale: 1,
  lapsed: 2,
  active: 3,
  life_member: 4,
};

export interface ReviewRow {
  readonly id: string;
  readonly personName: string;
  readonly state: RetentionState;
  readonly detail: string | null;
}

export interface ReviewGroup {
  readonly state: RetentionState;
  readonly label: string;
  readonly rows: readonly ReviewRow[];
  /** Only one group is actionable, and the screen must not imply otherwise. */
  readonly actionable: boolean;
}

export function groupReviews(rows: readonly ReviewRow[]): readonly ReviewGroup[] {
  const byState = new Map<RetentionState, ReviewRow[]>();
  for (const row of rows) {
    const existing = byState.get(row.state);
    if (existing === undefined) byState.set(row.state, [row]);
    else existing.push(row);
  }

  return [...byState.entries()]
    .sort((a, b) => ORDER[a[0]] - ORDER[b[0]])
    .map(([state, group]) => ({
      state,
      label: RETENTION_LABEL[state],
      rows: group.sort((a, b) => a.personName.localeCompare(b.personName)),
      actionable: state === 'due_for_disposal',
    }));
}

export interface RequestRow {
  readonly state: 'received' | 'honoured' | 'refused' | 'withdrawn';
}

/**
 * How many requests are still unanswered.
 *
 * Counts `received` only. A refused request is **answered** — that is the
 * whole point of BR49 — and counting it as outstanding would make the
 * screen nag a club into re-deciding something it has already decided
 * correctly.
 */
export function awaitingDecision(requests: readonly RequestRow[]): number {
  return requests.filter((r) => r.state === 'received').length;
}

/** What the disposal button must say before somebody presses it. */
export function disposalWarning(personName: string): string {
  return `Delete ${personName}'s record and everything attached to it — registrations, roles, `
    + 'consents, documents and guardianships. This cannot be undone, and nothing is kept to '
    + 'identify them afterwards.';
}
