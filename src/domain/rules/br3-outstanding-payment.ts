import { fail, pass, type RegistrationRule } from './types.ts';

/** Formats cents as plain dollars for a message a treasurer will read. */
function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * BR3 — a registration cannot be COMPLETE with an outstanding payment.
 *
 * A credit (negative outstanding) is not an obstacle to completing; it is a
 * finance matter, and blocking a child from playing over the club owing
 * *them* money would be the wrong way round.
 */
export const br3OutstandingPayment: RegistrationRule = {
  id: 'BR3',
  summary: 'No outstanding payment remains',
  evaluate: ({ registration }) => {
    const outstanding = registration.outstandingAmountCents;
    return outstanding <= 0
      ? pass('BR3', 'Nothing outstanding.')
      : fail('BR3', `${money(outstanding)} is still outstanding.`);
  },
};
