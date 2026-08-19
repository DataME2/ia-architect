/**
 * Database rows in, domain values out.
 *
 * Pure — no client, no I/O. This is the only place that knows both shapes,
 * which is what lets the domain stay free of `snake_case` and of the
 * database's idea of null.
 */

import type {
  Consent,
  Guardianship,
  Person,
  Registration,
} from '../domain/types.ts';
import type {
  ConsentRow,
  GuardianshipRow,
  PersonRow,
  RegistrationDocumentRow,
  RegistrationRow,
} from './schema.ts';

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    clubId: row.club_id,
    legalName: {
      givenNames: row.legal_given_names,
      familyName: row.legal_family_name,
    },
    legalNameVerifiedAt: row.legal_name_verified_at,
    preferredName: row.preferred_name,
    dateOfBirth: row.date_of_birth,
    email: row.email,
    photoPath: row.photo_path,
  };
}

export function toGuardianship(row: GuardianshipRow): Guardianship {
  return {
    personId: row.person_id,
    guardianPersonId: row.guardian_person_id,
    isAuthority: row.is_authority,
    isContact: row.is_contact,
  };
}

export function toConsent(row: ConsentRow): Consent {
  return {
    personId: row.person_id,
    purpose: row.purpose,
    grantedByPersonId: row.granted_by_person_id,
    grantedAt: row.granted_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * A registration, with its document requirements folded in.
 *
 * BR2 asks "which required documents are missing", which is a question about
 * the `registration_document` rows rather than about the registration row —
 * so the two are assembled here rather than leaving the rules engine to
 * issue a second query it is not allowed to issue.
 */
export function toRegistration(
  row: RegistrationRow,
  documents: readonly RegistrationDocumentRow[],
): Registration {
  const required = documents.filter((d) => d.required).map((d) => d.document_type);
  const provided = documents
    .filter((d) => d.provided_at !== null)
    .map((d) => d.document_type);

  return {
    id: row.id,
    clubId: row.club_id,
    seasonId: row.season_id,
    personId: row.person_id,
    status: row.status,
    requiredDocumentTypes: required,
    providedDocumentTypes: provided,
    outstandingAmountCents: row.outstanding_amount_cents,
  };
}
