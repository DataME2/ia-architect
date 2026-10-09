/**
 * The registration form in steps (scope 91).
 *
 * The steps are layout only. It is still one form with one submit, the same
 * action and the same `parseRegistrationForm`: "Next" runs that parser on
 * everything typed so far and shows only the errors that belong to the step
 * on screen, so the rules are never restated here. When the server sends
 * errors back, the form opens the first step that holds one.
 */
import type { FieldError } from './registration-form.ts';

export interface WizardStep {
  readonly key: 'player' | 'guardian' | 'permissions' | 'extras' | 'review';
  readonly label: string;
  /** The form fields this step owns. Errors are matched to steps by these. */
  readonly fields: readonly string[];
}

export const WIZARD_STEPS: readonly WizardStep[] = [
  {
    key: 'player',
    label: 'The player',
    fields: ['legalGivenNames', 'legalFamilyName', 'preferredName', 'dateOfBirth', 'email'],
  },
  { key: 'guardian', label: 'Parent or guardian', fields: ['guardianGivenNames', 'guardianFamilyName', 'guardianEmail'] },
  { key: 'permissions', label: 'Permissions', fields: ['consentCollectionNotice', 'consentPhotograph', 'consentPublicity'] },
  {
    key: 'extras',
    label: 'Officiating and season',
    fields: ['wantsToOfficiate', 'hasOfficiatedBefore', 'accreditationNumber', 'accreditationLevel', 'seasonId'],
  },
  { key: 'review', label: 'Review and documents', fields: [] },
];

/** The step a field belongs to; an unknown field is shown on the first step. */
export function stepOfField(field: string): number {
  const i = WIZARD_STEPS.findIndex((s) => s.fields.includes(field));
  return i < 0 ? 0 : i;
}

/** The errors that belong to one step. */
export function errorsForStep(errors: readonly FieldError[], step: number): readonly FieldError[] {
  return errors.filter((e) => stepOfField(e.field) === step);
}

/** The first step holding an error, or null when there is none. */
export function firstStepWithError(errors: readonly FieldError[]): number | null {
  if (errors.length === 0) return null;
  return Math.min(...errors.map((e) => stepOfField(e.field)));
}

/** One line of the review step: what was entered, as the family will check it. */
export interface ReviewLine {
  readonly label: string;
  readonly value: string;
}

const yes = (v: string | undefined) => (v === 'on' || v === 'true' ? 'Yes' : 'No');

/**
 * What the family typed, read back before they submit. Names are shown
 * exactly as entered: the legal name is the one thing BR55 says must match
 * the document, so the review must not tidy it.
 */
export function reviewLines(values: Readonly<Record<string, string | undefined>>): readonly ReviewLine[] {
  const v = (k: string) => (values[k] ?? '').trim();
  const lines: ReviewLine[] = [
    { label: 'Legal name', value: `${v('legalGivenNames')} ${v('legalFamilyName')}`.trim() || '—' },
    { label: 'Known as', value: v('preferredName') || '—' },
    { label: 'Date of birth', value: v('dateOfBirth') || '—' },
    { label: 'Player email', value: v('email') || '—' },
  ];
  if (v('guardianGivenNames') !== '' || v('guardianFamilyName') !== '' || v('guardianEmail') !== '') {
    lines.push(
      { label: 'Parent or guardian', value: `${v('guardianGivenNames')} ${v('guardianFamilyName')}`.trim() || '—' },
      { label: 'Guardian email', value: v('guardianEmail') || '—' },
    );
  }
  lines.push(
    { label: 'Collection notice read', value: yes(values['consentCollectionNotice']) },
    { label: 'Identification photograph', value: yes(values['consentPhotograph']) },
    { label: 'Social media and promotion', value: yes(values['consentPublicity']) },
    { label: 'Interested in officiating', value: yes(values['wantsToOfficiate']) },
  );
  return lines;
}
