/**
 * The family registration form, as logic rather than as markup.
 *
 * Pure: strings in, a validated draft or a list of field errors out. No
 * React, no request, no clock — `today` is passed in so every age boundary
 * is testable rather than dependent on when the suite runs.
 *
 * This is the deterministic layer Principle P3 asks for, sitting in front of
 * the form: a guardian is told what is wrong **while they are still on the
 * page**, which is the whole point of the slice. The rules engine
 * (`src/domain/rules/`) then re-evaluates server-side against the persisted
 * record — this layer is a courtesy to the family, never the authority.
 */

import { ageAt, type IsoDate, type LegalName } from '../domain/types.ts';

export interface FieldError {
  readonly field: string;
  readonly message: string;
}

export interface GuardianDraft {
  readonly legalName: LegalName;
  readonly email: string | null;
}

export interface ConsentDraft {
  /** BR48. Typed `true` because parsing fails without it. */
  readonly collectionNotice: true;
  /** BR56. Optional; refusing it never blocks a registration. */
  readonly photograph: boolean;
  /** BR57. Optional, and the default is off. */
  readonly publicity: boolean;
}

export interface RegistrationDraft {
  readonly legalName: LegalName;
  readonly preferredName: string | null;
  readonly dateOfBirth: IsoDate;
  readonly email: string | null;
  readonly isMinor: boolean;
  /** Required when `isMinor` (BR1); the parse fails without it. */
  readonly guardian: GuardianDraft | null;
  readonly consents: ConsentDraft;
}

export type ParseResult =
  | { readonly ok: true; readonly draft: RegistrationDraft }
  | { readonly ok: false; readonly errors: readonly FieldError[] };

export type FormInput = Readonly<Record<string, string | undefined>>;

/** The oldest plausible living registrant; guards a typo'd century. */
const MAX_AGE_YEARS = 120;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Deliberately permissive. Rejecting unusual-but-valid addresses costs a
 * family their registration; the address is confirmed by it being used.
 */
const EMAIL_SHAPE = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

/**
 * Collapse internal runs of whitespace and trim the ends.
 *
 * Not cosmetic. A trailing space on a family name is invisible on screen and
 * breaks BR44's name-and-date-of-birth matching against the governing body's
 * system — the same class of failure BR55 exists to remove, arriving through
 * a different door.
 */
function normalise(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

function isChecked(value: string | undefined): boolean {
  return value === 'on' || value === 'true' || value === '1';
}

/** A real calendar date in `YYYY-MM-DD`, rejecting 2026-02-30 and friends. */
function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}

function parseName(
  input: FormInput,
  givenField: string,
  familyField: string,
  label: string,
  errors: FieldError[],
): LegalName | null {
  const givenNames = normalise(input[givenField]);
  const familyName = normalise(input[familyField]);

  if (givenNames === '') {
    errors.push({
      field: givenField,
      message: `Enter ${label} given names exactly as they appear on their passport or birth certificate.`,
    });
  }
  if (familyName === '') {
    errors.push({
      field: familyField,
      message: `Enter ${label} family name exactly as it appears on their passport or birth certificate.`,
    });
  }
  return givenNames && familyName ? { givenNames, familyName } : null;
}

function parseOptionalEmail(
  input: FormInput,
  field: string,
  errors: FieldError[],
): string | null {
  const value = normalise(input[field]).toLowerCase();
  if (value === '') return null;
  if (!EMAIL_SHAPE.test(value)) {
    errors.push({ field, message: 'Enter an email address in the form name@example.com.' });
    return null;
  }
  return value;
}

/**
 * Validate one family submission.
 *
 * `today` decides minority, so BR1's guardian requirement is enforced on the
 * form rather than discovered after submission.
 */
export function parseRegistrationForm(
  input: FormInput,
  options: { readonly today: IsoDate },
): ParseResult {
  const errors: FieldError[] = [];

  const legalName = parseName(
    input,
    'legalGivenNames',
    'legalFamilyName',
    "the player's",
    errors,
  );

  const preferredNameRaw = normalise(input['preferredName']);
  const preferredName = preferredNameRaw === '' ? null : preferredNameRaw;

  const dateOfBirthRaw = normalise(input['dateOfBirth']);
  let dateOfBirth: IsoDate | null = null;
  let age: number | null = null;

  if (dateOfBirthRaw === '') {
    errors.push({ field: 'dateOfBirth', message: 'Enter the date of birth.' });
  } else if (!isRealIsoDate(dateOfBirthRaw)) {
    errors.push({ field: 'dateOfBirth', message: 'Enter the date of birth as a real date.' });
  } else {
    const years = ageAt(dateOfBirthRaw, options.today);
    if (years < 0) {
      errors.push({ field: 'dateOfBirth', message: 'The date of birth is in the future.' });
    } else if (years > MAX_AGE_YEARS) {
      errors.push({
        field: 'dateOfBirth',
        message: 'Check the year — that date of birth looks like a typing error.',
      });
    } else {
      dateOfBirth = dateOfBirthRaw;
      age = years;
    }
  }

  const email = parseOptionalEmail(input, 'email', errors);

  // BR1 — a minor needs a guardian holding authority. Enforced here so the
  // family is told on the page, not after the registrar picks it up.
  const isMinor = age !== null && age < 18;
  let guardian: GuardianDraft | null = null;

  if (isMinor) {
    const guardianName = parseName(
      input,
      'guardianGivenNames',
      'guardianFamilyName',
      "the parent or guardian's",
      errors,
    );
    const guardianEmail = parseOptionalEmail(input, 'guardianEmail', errors);

    if (guardianEmail === null && normalise(input['guardianEmail']) === '') {
      errors.push({
        field: 'guardianEmail',
        message: 'Enter an email address for the parent or guardian — the club needs a way to reach them.',
      });
    }
    if (guardianName !== null) {
      guardian = { legalName: guardianName, email: guardianEmail };
    }
  }

  // BR48 — the collection notice is the lawful basis for holding any of
  // this. Without it there is nothing to save.
  const collectionNotice = isChecked(input['consentCollectionNotice']);
  if (!collectionNotice) {
    errors.push({
      field: 'consentCollectionNotice',
      message: 'The club cannot record this registration without acknowledging the collection notice.',
    });
  }

  if (errors.length > 0 || legalName === null || dateOfBirth === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    draft: {
      legalName,
      preferredName,
      dateOfBirth,
      email,
      isMinor,
      guardian,
      consents: {
        collectionNotice: true,
        // BR56 and BR57 are independent and both default to off.
        photograph: isChecked(input['consentPhotograph']),
        publicity: isChecked(input['consentPublicity']),
      },
    },
  };
}
