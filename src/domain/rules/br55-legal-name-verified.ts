import { fail, pass, type RegistrationRule } from './types.ts';

const blank = (value: string): boolean => value.trim().length === 0;

/**
 * BR55 — the registered name is the legal name, checked against an identity
 * document.
 *
 * This is the rule that attacks the confirmed dominant cause of the weeks-long
 * baseline: a nickname entered where the passport name belongs. Holding a
 * legal name is not enough — it has to have been *checked*, or the mismatch
 * is discovered by the federation instead of by the club.
 */
export const br55LegalNameVerified: RegistrationRule = {
  id: 'BR55',
  summary: 'Legal name is present and verified against an identity document',
  evaluate: ({ person }) => {
    if (blank(person.legalName.givenNames) || blank(person.legalName.familyName)) {
      return fail(
        'BR55',
        'Legal given names and family name are required, exactly as they appear on the passport or birth certificate.',
      );
    }
    if (person.legalNameVerifiedAt === null) {
      return fail(
        'BR55',
        'The legal name has not been checked against an identity document yet.',
      );
    }
    return pass('BR55', 'Legal name verified against an identity document.');
  },
};
