import { isMinor } from '../types.ts';
import { fail, pass, type RegistrationRule } from './types.ts';

/**
 * BR1 — a minor's registration cannot be COMPLETE without an associated
 * Guardian.
 *
 * Checks for a guardianship carrying *authority*, not merely contactability:
 * after BR67's transfer at 18 a parent may remain a contact without being
 * able to consent, and a contact-only link does not satisfy duty of care.
 */
export const br1GuardianRequired: RegistrationRule = {
  id: 'BR1',
  summary: "A minor's registration requires a Guardian with authority",
  evaluate: ({ person, guardianships, asAt }) => {
    if (!isMinor(person, asAt)) {
      return pass('BR1', 'Person is 18 or over; no guardian required.');
    }
    const hasAuthority = guardianships.some(
      (g) => g.personId === person.id && g.isAuthority,
    );
    return hasAuthority
      ? pass('BR1', 'Guardian with authority is recorded.')
      : fail('BR1', 'This player is under 18 and needs a parent or guardian recorded.');
  },
};
