/**
 * The state a registration form hands back to the screen.
 *
 * Lives here rather than beside either action because both the
 * registrar-assisted form and the public invitation link return it — and
 * because a `'use server'` module may only export async functions, so a
 * shared constant cannot live in one.
 */
import type { RuleOutcome } from '../domain/rules/types.ts';
import type { FieldError } from './registration-form.ts';

export interface RegistrationFormState {
  readonly status: 'idle' | 'error' | 'done';
  readonly errors: readonly FieldError[];
  readonly message: string | null;
  /** What the family still has to do, in rule order. */
  readonly outstanding: readonly RuleOutcome[];
  readonly registrationId: string | null;
}

export const EMPTY_FORM_STATE: RegistrationFormState = {
  status: 'idle',
  errors: [],
  message: null,
  outstanding: [],
  registrationId: null,
};

export function formErrorState(
  message: string,
  errors: readonly FieldError[] = [],
): RegistrationFormState {
  return { status: 'error', errors, message, outstanding: [], registrationId: null };
}
