/**
 * Correcting a Person's details on the People screen (scope 68) — names,
 * email and date of birth, for the mistakes an import or a hurried form
 * leaves behind.
 *
 * One rule shapes it (BR55): a legal name that was checked against a
 * document is a claim about *that* name. Changing it withdraws the check,
 * so the Person reads "Name unverified" again until someone looks at the
 * document — otherwise a typo fix would quietly carry a verification the
 * new name never had, and the federation receives the legal name.
 */

export const PLACEHOLDER_BIRTH_DATE = '1900-01-01';

export interface PersonEdit {
  readonly legalGivenNames: string;
  readonly legalFamilyName: string;
  readonly preferredName: string | null;
  readonly email: string | null;
  readonly dateOfBirth: string;
}

export type ParsedEdit =
  | { readonly ok: true; readonly value: PersonEdit }
  | { readonly ok: false; readonly message: string };

const tidy = (s: string | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

export function parsePersonEdit(
  input: Readonly<Record<string, string | undefined>>,
  today: string,
): ParsedEdit {
  const legalGivenNames = tidy(input.legalGivenNames);
  const legalFamilyName = tidy(input.legalFamilyName);
  if (legalGivenNames === '' || legalFamilyName === '') {
    return { ok: false, message: 'Enter both the given name(s) and the family name, as on their documents.' };
  }

  const preferred = tidy(input.preferredName);
  const email = tidy(input.email).toLowerCase();
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: 'That email address does not look right.' };
  }

  // Blank keeps an import's placeholder rather than inventing a birthday.
  const born = tidy(input.dateOfBirth);
  const dateOfBirth = born === '' ? PLACEHOLDER_BIRTH_DATE : born;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || Number.isNaN(Date.parse(dateOfBirth))) {
    return { ok: false, message: 'Enter the date of birth as a real calendar date.' };
  }
  if (dateOfBirth > today) return { ok: false, message: 'The date of birth cannot be in the future.' };

  return {
    ok: true,
    value: {
      legalGivenNames,
      legalFamilyName,
      preferredName: preferred === '' ? null : preferred,
      email: email === '' ? null : email,
      dateOfBirth,
    },
  };
}

/** BR55: did the legal name itself change (not just its spacing)? */
export function legalNameChanged(
  before: { readonly legalGivenNames: string; readonly legalFamilyName: string },
  after: PersonEdit,
): boolean {
  return tidy(before.legalGivenNames) !== after.legalGivenNames
    || tidy(before.legalFamilyName) !== after.legalFamilyName;
}

/** Which fields changed, for the audit log's detail — never the values of unchanged ones. */
export function changedFields(
  before: PersonEdit,
  after: PersonEdit,
): (keyof PersonEdit)[] {
  return (Object.keys(after) as (keyof PersonEdit)[]).filter((k) => (before[k] ?? null) !== (after[k] ?? null));
}
