import { planState } from '../finance/plan.ts';
import { formatMoney } from '../finance/money.ts';
import { fail, pass, type RegistrationRule } from './types.ts';

/**
 * BR3 — a registration cannot be COMPLETE with anything outstanding.
 *
 * **The club's policy is no pay, no play, and it is absolute** (BR79): any
 * amount still owed keeps the player off the field, whether or not a payment
 * plan has been agreed. So a plan does not soften this rule. It schedules
 * the debt and gives the club something to chase; it does not buy the child
 * a game.
 *
 * The plan still changes what this rule *says*. "$80.32 outstanding" and
 * "$80.32 outstanding, and you missed the instalment due on 1 April" send a
 * family to two different places, and only the second is a reason to ring
 * them today — so where a plan exists the message carries both the balance
 * and the arrears.
 *
 * A credit is never an obstacle. Blocking a child because the club owes
 * *them* money would be the wrong way round.
 */
export const br3OutstandingPayment: RegistrationRule = {
  id: 'BR3',
  summary: 'Nothing is outstanding',
  evaluate: ({ registration, paymentPlan, payments, asAt }) => {
    const outstanding = registration.outstandingAmountCents;

    if (outstanding <= 0) {
      return pass('BR3', outstanding === 0
        ? 'Nothing outstanding.'
        : `Paid in full, with a credit of ${formatMoney(-outstanding)}.`);
    }

    if (paymentPlan !== null && paymentPlan.cancelledAt === null) {
      const state = planState(paymentPlan.totalCents, paymentPlan.installments, payments, asAt);
      const next = state.nextDue;

      return fail(
        'BR3',
        state.arrearsCents > 0
          ? `${formatMoney(outstanding)} outstanding, and ${formatMoney(state.arrearsCents)} of the payment plan is overdue.`
          : `${formatMoney(outstanding)} outstanding on a payment plan — up to date, next instalment ${next === null ? 'none' : `${formatMoney(next.installment.amountCents - next.paidCents)} on ${next.installment.dueOn}`}.`,
      );
    }

    return fail('BR3', `${formatMoney(outstanding)} is still outstanding.`);
  },
};
