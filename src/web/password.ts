/**
 * What counts as an acceptable password, decided once.
 *
 * Deliberately short on rules. Composition requirements — a capital, a
 * digit, a symbol — reliably produce `Password1!` and are discouraged by
 * current guidance for exactly that reason; length is what actually helps.
 * So: long enough, not the obvious guesses, and not the person's own email.
 */

export const MINIMUM_LENGTH = 12;

const OBVIOUS = [
  'password',
  'letsdatatalk',
  'football',
  '123456',
  'qwerty',
  'changeme',
  'welcome',
];

export function passwordProblem(
  password: string,
  confirmation: string,
  email: string,
): string | null {
  if (password === '') return 'Choose a password.';

  if (password.length < MINIMUM_LENGTH) {
    return `Use at least ${MINIMUM_LENGTH} characters. Length is what makes a password hard to guess — a passphrase of a few words is easier to remember and harder to break than a short one with symbols in it.`;
  }

  if (password !== confirmation) return 'The two passwords do not match.';

  const lower = password.toLowerCase();
  const localPart = email.split('@')[0]?.toLowerCase() ?? '';

  if (lower === email.toLowerCase() || (localPart.length >= 4 && lower.includes(localPart))) {
    return 'Do not use your own email address as your password.';
  }

  if (OBVIOUS.some((word) => lower.includes(word))) {
    return 'That is one of the first things anybody guesses. Pick something else.';
  }

  return null;
}
