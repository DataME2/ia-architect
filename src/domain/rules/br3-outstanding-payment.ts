import { planState } from '../finance/plan.ts';
import { fail, pass, type RegistrationRule } from './types.ts';

/** Formats cents as plain dollars for a message a treasurer will read. */
function money(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/**
 * BR3 — a registration cannot be COMPLETE while payment is behind.
 *
 * **Restated when payment plans arrived.** The original rule blocked on any
 * outstanding balance, which is right when a fee is due in full and wrong
 * the moment a club offers instalments: a family three weeks into a
 * five-month plan, having paid everything asked of them, would have been
 * held out of the season by a rule meant to catch non-payment. That would
 * have made the plan worthless — the club could offer one, and the child
 * still could not play.
 *
 * So what blocks is **arrears**, not balance. With a live plan the question
 * is whether every instalment already due has been paid; without one it is
 * the whole balance, which is the old rule unchanged.
 *
 * A credit is not an obstacle either way. Blocking a child from playing
 * because the club owes *them* money would be the wrong way round.
 */
export const br3OutstandingPayment: RegistrationRule = {
  id: 'BR3',
  summary: 'Payment is up to date — no arrears, or nothing outstanding',
  evaluate: ({ registration, paymentPlan, payments, asAt }) => {
    if (paymentPlan !== null && paymentPlan.cancelledAt === null) {
      const state = planState(
        paymentPlan.totalCents,
        paymentPlan.installments,
        payments,
        asAt,
      );

      if (state.arrearsCents > 0) {
        return fail('BR3', `${money(state.arrearsCents)} of the payment plan is overdue.`);
      }
      return state.outstandingCents > 0
        ? pass(
            'BR3',
            `On a payment plan and up to date — ${money(state.outstandingCents)} still to come, next due ${state.nextDue?.installment.dueOn ?? 'never'}.`,
          )
        : pass('BR3', 'The payment plan is paid in full.');
    }

    const outstanding = registration.outstandingAmountCents;
    return outstanding <= 0
      ? pass('BR3', 'Nothing outstanding.')
      : fail('BR3', `${money(outstanding)} is still outstanding.`);
  },
};
