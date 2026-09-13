/**
 * A guardian's household at a glance — one card per child, and which child
 * the detail beneath them is about.
 *
 * Pure, so what a card claims about a child is tested rather than eyeballed:
 * a card that says "Registered" over a child who cannot take the field is the
 * failure BR79 exists to prevent, and it would look fine in review.
 */

import { formatMoney } from '../domain/finance/money.ts';
import type { RuleOutcome } from '../domain/rules/types.ts';
import { ageAt, type IsoDate, type Person, type RegistrationStatus } from '../domain/types.ts';
import { displayNameFor } from './queue-view.ts';

export const STATUS_LABEL: Readonly<Record<RegistrationStatus, string>> = {
  DRAFT: 'Draft',
  PENDING_DOCUMENTS: 'Awaiting documents',
  PENDING_PAYMENT: 'Awaiting payment',
  PENDING_EXTERNAL_REGISTRATION: 'Sent — not yet registered',
  COMPLETE: 'Registered',
};

/** What each rule is about, said the way a guardian would say it. */
export const RULE_TITLE: Readonly<Record<string, string>> = {
  BR55: 'Legal name checked',
  BR1: 'Guardian recorded',
  BR48: 'Consents recorded',
  BR2: 'Required documents',
  BR3: 'Fees',
};

export type Tone = 'ok' | 'wait' | 'stop' | 'none';

export interface ChildCardInput {
  readonly person: Person;
  /** Null when the child has no registration this season. */
  readonly status: RegistrationStatus | null;
  readonly outcomes: readonly RuleOutcome[];
  /** Negative is a credit the club holds, not a debt. */
  readonly balanceCents: number;
}

export interface ChildCard {
  readonly personId: string;
  readonly name: string;
  readonly age: number;
  readonly tone: Tone;
  readonly label: string;
  readonly blockers: readonly RuleOutcome[];
  readonly money: string | null;
}

export function moneyLine(balanceCents: number): string {
  if (balanceCents > 0) return `${formatMoney(balanceCents)} outstanding`;
  if (balanceCents < 0) return `${formatMoney(-balanceCents)} in credit`;
  return 'Paid in full';
}

/**
 * The "remaining" figure, which a family should never read as negative:
 * paying more than the plan leaves the club holding a credit.
 */
export function remainingFigure(outstandingCents: number): { readonly label: 'Remaining' | 'Credit'; readonly cents: number } {
  return outstandingCents < 0
    ? { label: 'Credit', cents: -outstandingCents }
    : { label: 'Remaining', cents: outstandingCents };
}

export function childCard(input: ChildCardInput, today: IsoDate): ChildCard {
  const base = {
    personId: input.person.id,
    name: displayNameFor(input.person),
    age: ageAt(input.person.dateOfBirth, today),
  };

  if (input.status === null) {
    return { ...base, tone: 'none', label: 'Not registered this season', blockers: [], money: null };
  }

  const money = moneyLine(input.balanceCents);

  // A COMPLETE registration has been decided. Re-running the rules against
  // it would resurface the registrar's own checklist (BR55) as if it were
  // the family's to act on.
  if (input.status === 'COMPLETE') {
    return input.balanceCents > 0
      ? { ...base, tone: 'stop', label: 'Registered — not clear to play', blockers: [], money }
      : { ...base, tone: 'ok', label: 'Registered', blockers: [], money };
  }

  const blockers = input.outcomes.filter((o) => o.status === 'fail');
  if (blockers.length > 0) {
    const label = blockers.length === 1 ? '1 thing outstanding' : `${blockers.length} things outstanding`;
    return { ...base, tone: 'stop', label, blockers, money };
  }
  return { ...base, tone: 'wait', label: STATUS_LABEL[input.status], blockers, money };
}

/** The requested child when it is one of these, otherwise the first. */
export function selectChild<T extends { readonly personId: string }>(
  cards: readonly T[],
  requested: string | null | undefined,
): T | null {
  return cards.find((c) => c.personId === requested) ?? cards[0] ?? null;
}
