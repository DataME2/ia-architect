/**
 * The registrar's queue, as logic rather than as markup.
 *
 * Pure. Given evaluated registrations, decides what the registrar sees
 * first, how each person is named on screen, and which rule is costing the
 * club the most registrations.
 */

import type { RegistrationStatus } from '../domain/types.ts';
import type { RuleId, RuleOutcome } from '../domain/rules/types.ts';

export interface QueueEntry {
  readonly registrationId: string;
  readonly personId: string;
  /** Preferred name where there is one — this is what a human reads (BR55). */
  readonly displayName: string;
  /** The name that goes to the governing body, shown so it can be checked. */
  readonly legalName: string;
  readonly status: RegistrationStatus;
  readonly outcomes: readonly RuleOutcome[];
  /** Unresolved BR5 candidates. A pack excludes these rather than guessing. */
  readonly duplicateCount: number;
  /** What the registration still owes (BR3). Negative is a credit. */
  readonly outstandingCents: number;
}

/** Which pile a registration lands in on the registrar's screen. */
export type QueueGroup = 'needs-action' | 'ready-to-submit' | 'awaiting-federation' | 'complete';

export interface GroupedQueue {
  readonly needsAction: readonly QueueEntry[];
  readonly readyToSubmit: readonly QueueEntry[];
  readonly awaitingFederation: readonly QueueEntry[];
  readonly complete: readonly QueueEntry[];
}

export function failing(entry: QueueEntry): readonly RuleOutcome[] {
  return entry.outcomes.filter((o) => o.status === 'fail');
}

/**
 * How a person is addressed on screen.
 *
 * The preferred name wins here and **only** here — BR55's whole point is
 * that a child known as "Alex" is called Alex by every human-facing surface
 * while "Alexandra" does the work only a legal name can do. The submission
 * pack builder never calls this.
 */
export function displayNameFor(person: {
  readonly preferredName: string | null;
  readonly legalName: { readonly givenNames: string; readonly familyName: string };
}): string {
  const first = person.preferredName?.trim() || person.legalName.givenNames;
  return `${first} ${person.legalName.familyName}`.trim();
}

export function fullLegalName(person: {
  readonly legalName: { readonly givenNames: string; readonly familyName: string };
}): string {
  return `${person.legalName.givenNames} ${person.legalName.familyName}`.trim();
}

/**
 * Where a registration belongs in the queue.
 *
 * `awaiting-federation` is separated from `complete` deliberately: under
 * BR60 a submitted player is *sent*, not registered, and under BR43 they
 * still cannot take the field. Collapsing the two piles would put a child on
 * the field because the club's own screen looked finished.
 */
export function groupFor(entry: QueueEntry): QueueGroup {
  if (entry.status === 'COMPLETE') return 'complete';
  if (entry.status === 'PENDING_EXTERNAL_REGISTRATION') return 'awaiting-federation';
  if (failing(entry).length > 0 || entry.duplicateCount > 0) return 'needs-action';
  return 'ready-to-submit';
}

/**
 * Most blockers first, then alphabetically.
 *
 * The registrar's scarcest resource is attention in the week before the
 * season starts, so the queue leads with the registration furthest from
 * done rather than with whoever happened to register first.
 */
function byUrgency(a: QueueEntry, b: QueueEntry): number {
  const diff = failing(b).length - failing(a).length;
  return diff !== 0 ? diff : a.displayName.localeCompare(b.displayName);
}

export function groupQueue(entries: readonly QueueEntry[]): GroupedQueue {
  const needsAction: QueueEntry[] = [];
  const readyToSubmit: QueueEntry[] = [];
  const awaitingFederation: QueueEntry[] = [];
  const complete: QueueEntry[] = [];

  for (const entry of entries) {
    switch (groupFor(entry)) {
      case 'needs-action':
        needsAction.push(entry);
        break;
      case 'ready-to-submit':
        readyToSubmit.push(entry);
        break;
      case 'awaiting-federation':
        awaitingFederation.push(entry);
        break;
      case 'complete':
        complete.push(entry);
        break;
    }
  }

  return {
    needsAction: [...needsAction].sort(byUrgency),
    readyToSubmit: [...readyToSubmit].sort(byUrgency),
    awaitingFederation: [...awaitingFederation].sort(byUrgency),
    complete: [...complete].sort(byUrgency),
  };
}

export interface BlockerCount {
  readonly ruleId: RuleId;
  readonly count: number;
  /** One representative message, so the summary reads without a lookup. */
  readonly example: string;
}

/**
 * How many registrations each rule is currently blocking, worst first.
 *
 * This is [open question #32](../../docs/scope/open-questions.md) turning
 * into a query. The registration baseline is known to be *weeks* and
 * believed to be dominated by BR55, but the proportion has never been
 * measured — because nobody kept the failure history. Persisting every
 * outcome and counting them here is what turns that from an instrumentation
 * project into a screen the registrar already looks at.
 */
export function blockerSummary(entries: readonly QueueEntry[]): readonly BlockerCount[] {
  const counts = new Map<RuleId, { count: number; example: string }>();

  for (const entry of entries) {
    for (const outcome of failing(entry)) {
      const existing = counts.get(outcome.ruleId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(outcome.ruleId, { count: 1, example: outcome.message });
      }
    }
  }

  return [...counts.entries()]
    .map(([ruleId, { count, example }]) => ({ ruleId, count, example }))
    .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId));
}
