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
      guardian: null,
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
      guardian: null,
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
      guardian: null,
    };
  }

  // Scope 39. The account-free path asks too — a family registering through
  // a link is exactly the family a club most needs to ask, and leaving the
  // question to the registrar's form would make the answer depend on which
  // door they came in.
  //
  // Never allowed to fail the registration (BR136): it is a claim about a
  // Person, and a registration saved without its officiating answer is
  // recoverable where the reverse is not.
  if (draft.officiating !== null) {
    await client.rpc('app_declare_interest', {
      p_registration_id: result.registrationId,
      p_wants: draft.officiating.wantsToOfficiate,
      p_before: draft.officiating.hasOfficiatedBefore,
      p_number: draft.officiating.accreditationNumber,
      p_level: draft.officiating.level,
      // The family asserted it themselves through the link. There is no
      // signed-in Person to attribute it to, and inventing one would be
      // exactly the inference decision 10 refuses.
      p_declared_by: null,
    });
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
    // Echoed back so the family can register a sibling without retyping
    // themselves (BR80). Exactly what they just typed — no identifier.
    guardian: draft.guardian,
  };
}
