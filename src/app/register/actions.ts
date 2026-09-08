'use server';

import { revalidatePath } from 'next/cache';

import {
  loadRegistrationDetail,
  loadTenantContext,
  persistValidation,
} from '../../data/queries.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { parseRegistrationForm } from '../../web/registration-form.ts';
import {
  formErrorState as errorState,
  type RegistrationFormState,
} from '../../web/registration-form-state.ts';
import { todayIn } from '../../web/today.ts';

/**
 * Accept one registrar-assisted submission.
 *
 * The order matters. The form's own checks run first and return **every**
 * problem at once, because a family sent round the loop once per mistake is
 * the confirmed dominant cause of the registration baseline (BR55). Only
 * then is anything written.
 *
 * **This action creates nothing itself.** It used to: six inserts, its own
 * guardian handling, its own idea of what a registration consists of. That
 * made it a second implementation of the player registration process, and
 * the second one silently fell behind — registrations made through the
 * club's own screen came out with no roles, no document checklist, no fee,
 * and a duplicated parent each time, while the family link got all four.
 * The process now lives once, in `app_create_registration`, and both
 * surfaces call it.
 *
 * The function runs as the caller, so Row-Level Security decides whether
 * this registrar may write into the club they named. A posted `club_id` is
 * an assertion; the policy is the fact.
 */
export async function submitRegistrationAction(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const input: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') input[key] = value;
  }

  const parsed = parseRegistrationForm(input, { today: todayIn() });
  if (!parsed.ok) {
    return errorState('Some details still need attention.', parsed.errors);
  }
  const draft = parsed.draft;

  const seasonId = String(formData.get('seasonId') ?? '');
  if (seasonId === '') return errorState('Choose the season this registration is for.');

  const client = await createRequestClient();
  const user = await currentUser(client);
  if (user === null) return errorState('Your session has expired. Sign in and try again.');

  const tenant = await loadTenantContext(client, user.id);
  if (tenant === null) return errorState('This account is not a member of any club.');

  const { data: registrationId, error } = await client.rpc('submit_club_registration', {
    p_club_id: tenant.clubId,
    p_season_id: seasonId,
    p_legal_given_names: draft.legalName.givenNames,
    p_legal_family_name: draft.legalName.familyName,
    p_preferred_name: draft.preferredName,
    p_date_of_birth: draft.dateOfBirth,
    p_email: draft.email,
    p_guardian_given_names: draft.guardian?.legalName.givenNames ?? null,
    p_guardian_family_name: draft.guardian?.legalName.familyName ?? null,
    p_guardian_email: draft.guardian?.email ?? null,
    p_consent_collection_notice: draft.consents.collectionNotice,
    p_consent_photograph: draft.consents.photograph,
    p_consent_publicity: draft.consents.publicity,
  });

  if (error !== null || typeof registrationId !== 'string') {
    return errorState(
      `The registration could not be saved. ${error?.message ?? 'No identifier came back.'}`,
    );
  }

  // Re-evaluated against what was actually persisted, not against the draft
  // — the browser's opinion is a courtesy, never the authority (P3). This
  // reads back through the same query the registrar's queue uses, so the
  // rules see the season's checklist and fee that the function just applied.
  const detail = await loadRegistrationDetail(
    client,
    tenant.clubId,
    seasonId,
    registrationId,
    todayIn(),
  );
  const outcomes = detail?.entry.outcomes ?? [];

  if (outcomes.length > 0) {
    await persistValidation(client, tenant.clubId, registrationId, outcomes);
  }

  revalidatePath('/registrar');

  return {
    status: 'done',
    errors: [],
    message: 'Registration received.',
    outstanding: outcomes.filter((o) => o.status === 'fail'),
    registrationId,
    guardian: draft.guardian,
  };
}
