'use server';

import { revalidatePath } from 'next/cache';

import { evaluateRegistration } from '../../domain/rules/index.ts';
import type { RuleOutcome } from '../../domain/rules/types.ts';
import { toConsent, toGuardianship, toRegistration } from '../../data/mappers.ts';
import { loadTenantContext, persistValidation, QueryError, recordAudit } from '../../data/queries.ts';
import type { ConsentRow, GuardianshipRow, PersonRow, RegistrationRow } from '../../data/schema.ts';
import { createRequestClient, currentUser } from '../../data/server.ts';
import { parseRegistrationForm, type FieldError } from '../../web/registration-form.ts';
import { todayIn } from '../../web/today.ts';

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

function errorState(message: string, errors: readonly FieldError[] = []): RegistrationFormState {
  return { status: 'error', errors, message, outstanding: [], registrationId: null };
}

/**
 * Accept one family submission.
 *
 * The order matters. The form's own checks run first and return **every**
 * problem at once, because a family sent round the loop once per mistake is
 * the confirmed dominant cause of the registration baseline (BR55). Only
 * then is anything written, and the rules engine re-evaluates server-side
 * against what was actually persisted — the browser's opinion is a courtesy,
 * never the authority (Principle P3).
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

  try {
    // ---- the player -----------------------------------------------------
    // `legal_name_verified_at` is deliberately left null: a family can state
    // a legal name, but only a club officer can record that one was checked
    // against a document (BR55). That gap is the first thing the registrar's
    // queue shows.
    const { data: personData, error: personError } = await client
      .from('person')
      .insert({
        club_id: tenant.clubId,
        legal_given_names: draft.legalName.givenNames,
        legal_family_name: draft.legalName.familyName,
        preferred_name: draft.preferredName,
        date_of_birth: draft.dateOfBirth,
        email: draft.email,
      })
      .select('*')
      .single<PersonRow>();
    if (personError !== null || personData === null) {
      throw new QueryError('person', personError?.message ?? 'insert returned nothing');
    }
    const person = personData;

    // ---- the guardian, for a minor (BR1) --------------------------------
    let guardianRow: GuardianshipRow | null = null;
    let consentGrantedBy = person.id;

    if (draft.guardian !== null) {
      const { data: guardianPerson, error: guardianError } = await client
        .from('person')
        .insert({
          club_id: tenant.clubId,
          legal_given_names: draft.guardian.legalName.givenNames,
          legal_family_name: draft.guardian.legalName.familyName,
          date_of_birth: '1900-01-01', // unknown; the guardian is not registering
          email: draft.guardian.email,
        })
        .select('id')
        .single<{ id: string }>();
      if (guardianError !== null || guardianPerson === null) {
        throw new QueryError('person (guardian)', guardianError?.message ?? 'insert returned nothing');
      }

      // BR67: two independent flags. Authority ends at 18; contactability
      // need not, and a single boolean cannot express the difference.
      const { data: linkData, error: linkError } = await client
        .from('guardianship')
        .insert({
          club_id: tenant.clubId,
          person_id: person.id,
          guardian_person_id: guardianPerson.id,
          is_authority: true,
          is_contact: true,
        })
        .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
        .single<GuardianshipRow>();
      if (linkError !== null || linkData === null) {
        throw new QueryError('guardianship', linkError?.message ?? 'insert returned nothing');
      }
      guardianRow = linkData;
      consentGrantedBy = guardianPerson.id;
    }

    // ---- consents, one row per purpose (BR48, BR56, BR57) ---------------
    const consentInserts = [
      { purpose: 'REGISTRATION_COLLECTION_NOTICE' as const, granted: true },
      { purpose: 'IDENTIFICATION_PHOTOGRAPH' as const, granted: draft.consents.photograph },
      { purpose: 'PUBLICITY' as const, granted: draft.consents.publicity },
    ]
      .filter((c) => c.granted)
      .map((c) => ({
        club_id: tenant.clubId,
        person_id: person.id,
        purpose: c.purpose,
        granted_by_person_id: consentGrantedBy,
      }));

    const { data: consentRows, error: consentError } = await client
      .from('consent')
      .insert(consentInserts)
      .select(
        'id, club_id, person_id, purpose, granted_by_person_id, granted_at, revoked_at, channels',
      );
    if (consentError !== null || consentRows === null) {
      throw new QueryError('consent', consentError?.message ?? 'insert returned nothing');
    }

    // ---- the registration ------------------------------------------------
    const { data: registrationData, error: registrationError } = await client
      .from('registration')
      .insert({
        club_id: tenant.clubId,
        person_id: person.id,
        season_id: seasonId,
        status: 'DRAFT',
      })
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .single<RegistrationRow>();
    if (registrationError !== null || registrationData === null) {
      throw new QueryError('registration', registrationError?.message ?? 'insert returned nothing');
    }

    // ---- evaluate against what was actually written ----------------------
    const outcomes = evaluateRegistration({
      registration: toRegistration(registrationData, []),
      person: {
        id: person.id,
        clubId: person.club_id,
        legalName: {
          givenNames: person.legal_given_names,
          familyName: person.legal_family_name,
        },
        legalNameVerifiedAt: person.legal_name_verified_at,
        preferredName: person.preferred_name,
        dateOfBirth: person.date_of_birth,
        email: person.email,
        photoPath: person.photo_path,
      },
      guardianships: guardianRow === null ? [] : [toGuardianship(guardianRow)],
      consents: (consentRows as ConsentRow[]).map(toConsent),
      asAt: todayIn(),
    });

    await persistValidation(client, tenant.clubId, registrationData.id, outcomes);
    await recordAudit(client, tenant.clubId, user.id, {
      action: 'registration_submitted',
      entity: 'registration',
      entityId: registrationData.id,
      detail: { isMinor: draft.isMinor, rulesEvaluated: outcomes.length },
    });

    revalidatePath('/registrar');

    return {
      status: 'done',
      errors: [],
      message: 'Registration received.',
      outstanding: outcomes.filter((o) => o.status === 'fail'),
      registrationId: registrationData.id,
    };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Unknown error';
    return errorState(`The registration could not be saved. ${detail}`);
  }
}
