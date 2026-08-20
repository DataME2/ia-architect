'use server';

import { evaluateRegistration } from '../../../domain/rules/index.ts';
import { submitPublicRegistration } from '../../../data/invitations.ts';
import { createRequestClient } from '../../../data/server.ts';
import { parseRegistrationForm } from '../../../web/registration-form.ts';
import type { RegistrationFormState } from '../../../web/registration-form-state.ts';
import { todayIn } from '../../../web/today.ts';

/**
 * Submit a registration through a public invitation link (BR72).
 *
 * Runs with no session, so the client here is `anon` and every write goes
 * through the one `security definer` function. The form's own checks run
 * first and report **every** problem at once — a family sent round the loop
 * once per mistake is the delay this whole slice exists to remove — but they
 * are a courtesy, not the authority: the database re-checks BR1 and BR48
 * because an anonymous caller can skip the form entirely.
 */
export async function submitJoinAction(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const token = String(formData.get('token') ?? '');
  if (token === '') {
    return {
      status: 'error',
      errors: [],
      message: 'This registration link is incomplete.',
      outstanding: [],
      registrationId: null,
    };
  }

  const input: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') input[key] = value;
  }

  const parsed = parseRegistrationForm(input, { today: todayIn() });
  if (!parsed.ok) {
    return {
      status: 'error',
      errors: parsed.errors,
      message: 'Some details still need attention.',
      outstanding: [],
      registrationId: null,
    };
  }
  const draft = parsed.draft;

  const client = await createRequestClient();
  const result = await submitPublicRegistration(client, token, {
    legalGivenNames: draft.legalName.givenNames,
    legalFamilyName: draft.legalName.familyName,
    preferredName: draft.preferredName,
    dateOfBirth: draft.dateOfBirth,
    email: draft.email,
    guardianGivenNames: draft.guardian?.legalName.givenNames ?? null,
    guardianFamilyName: draft.guardian?.legalName.familyName ?? null,
    guardianEmail: draft.guardian?.email ?? null,
    consentPhotograph: draft.consents.photograph,
    consentPublicity: draft.consents.publicity,
  });

  if (!result.ok) {
    return {
      status: 'error',
      errors: [],
      message: result.detail,
      outstanding: [],
      registrationId: null,
    };
  }

  // What the family still has to do. Evaluated in memory from what was just
  // submitted and *not* persisted: an anonymous caller holds no grant on
  // `validation_result`, and giving one would let anybody write arbitrary
  // rule outcomes into a club. The registrar's queue re-evaluates on load,
  // which is where the persisted history comes from.
  const outstanding = evaluateRegistration({
    registration: {
      id: result.registrationId,
      clubId: '',
      seasonId: '',
      personId: '',
      status: 'DRAFT',
      requiredDocumentTypes: [],
      providedDocumentTypes: [],
      outstandingAmountCents: 0,
    },
    person: {
      id: '',
      clubId: '',
      legalName: draft.legalName,
      // BR55: the family stated it; only a club officer can verify it, so
      // this is genuinely outstanding rather than pessimistic.
      legalNameVerifiedAt: null,
      preferredName: draft.preferredName,
      dateOfBirth: draft.dateOfBirth,
      email: draft.email,
      photoPath: null,
    },
    guardianships:
      draft.guardian === null
        ? []
        : [{ personId: '', guardianPersonId: 'guardian', isAuthority: true, isContact: true }],
    consents: [
      {
        personId: '',
        purpose: 'REGISTRATION_COLLECTION_NOTICE',
        grantedByPersonId: draft.guardian === null ? '' : 'guardian',
        grantedAt: new Date().toISOString(),
        revokedAt: null,
      },
    ],
    paymentPlan: null,
    payments: [],
    asAt: todayIn(),
  }).filter((o) => o.status === 'fail');

  return {
    status: 'done',
    errors: [],
    message: 'Registration received.',
    outstanding,
    registrationId: result.registrationId,
  };
}
