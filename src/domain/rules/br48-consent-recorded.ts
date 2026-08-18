import { isMinor } from '../types.ts';
import { fail, pass, type RegistrationRule } from './types.ts';

/**
 * BR48 — a minor's data is processed only under explicit, recorded consent,
 * and the collection notice must be acknowledged for anyone.
 *
 * Two checks in one rule because they are one question asked of two people:
 * is there a live consent for this purpose, and — for a minor — did someone
 * with *authority* give it? A consent granted by a guardian whose authority
 * has ended (BR67) is not a consent.
 */
export const br48ConsentRecorded: RegistrationRule = {
  id: 'BR48',
  summary: 'A live collection-notice consent exists, granted by someone with authority',
  evaluate: ({ person, consents, guardianships, asAt }) => {
    const live = consents.filter(
      (c) =>
        c.personId === person.id &&
        c.purpose === 'REGISTRATION_COLLECTION_NOTICE' &&
        c.revokedAt === null,
    );
    if (live.length === 0) {
      return fail('BR48', 'The registration privacy notice has not been acknowledged yet.');
    }
    if (!isMinor(person, asAt)) {
      return pass('BR48', 'Collection notice acknowledged.');
    }
    const authorities = new Set(
      guardianships.filter((g) => g.personId === person.id && g.isAuthority)
        .map((g) => g.guardianPersonId),
    );
    const byAuthority = live.some((c) => authorities.has(c.grantedByPersonId));
    return byAuthority
      ? pass('BR48', 'Collection notice acknowledged by a guardian with authority.')
      : fail(
          'BR48',
          'The privacy notice was acknowledged, but not by a parent or guardian with authority for this player.',
        );
  },
};
