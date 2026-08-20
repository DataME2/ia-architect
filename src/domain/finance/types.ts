/**
 * Payment plans and what has actually been received.
 *
 * Realises the Payment Plan / Installment business object
 * (`docs/ea/2_business/4_business-objects.md`) and the payment plan process.
 * Pure types — no I/O, no framework, and no payment provider: this layer
 * records what a family owes and what the club has received, which is a
 * different question from how the money moved.
 */
import type { IsoDate, IsoInstant } from '../types.ts';

/** Cadence of a plan's instalments. Weekly exists because seasons are short. */
export const PLAN_CADENCES = ['weekly', 'fortnightly', 'monthly'] as const;
export type PlanCadence = (typeof PLAN_CADENCES)[number];

export interface Installment {
  /** 1-based, in due-date order. Stable — it is how a family refers to one. */
  readonly sequence: number;
  readonly dueOn: IsoDate;
  readonly amountCents: number;
}

export interface PaymentPlan {
  readonly id: string;
  readonly registrationId: string;
  /** What the plan is for. Instalments sum to exactly this (BR74). */
  readonly totalCents: number;
  readonly cadence: PlanCadence;
  readonly installments: readonly Installment[];
  readonly cancelledAt: IsoInstant | null;
}

export const PAYMENT_METHODS = ['card', 'bank-transfer', 'cash', 'voucher', 'adjustment'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Money received against a registration.
 *
 * `amountCents` may be negative — a refund, or a correction. Corrections are
 * reversing entries rather than edits (BR77): a receipt that can be quietly
 * changed is not a record of anything.
 */
export interface Payment {
  readonly id: string;
  readonly registrationId: string;
  readonly amountCents: number;
  readonly receivedOn: IsoDate;
  readonly method: PaymentMethod;
  /** The provider's reference, a receipt number, or whatever ties it to reality. */
  readonly reference: string | null;
  /** Set when this entry reverses an earlier one (BR77). */
  readonly reversesPaymentId: string | null;
}

/** One instalment, with what has been allocated to it. */
export interface InstallmentState {
  readonly installment: Installment;
  readonly paidCents: number;
  readonly outstandingCents: number;
  /** Past its due date with something still outstanding. */
  readonly overdue: boolean;
}

export interface PlanState {
  readonly totalCents: number;
  readonly paidCents: number;
  readonly outstandingCents: number;
  readonly installments: readonly InstallmentState[];
  /** Outstanding on instalments already due — what BR3 actually cares about. */
  readonly arrearsCents: number;
  readonly nextDue: InstallmentState | null;
}
