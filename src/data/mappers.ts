/**
 * Database rows in, domain values out.
 *
 * Pure — no client, no I/O. This is the only place that knows both shapes,
 * which is what lets the domain stay free of `snake_case` and of the
 * database's idea of null.
 */

import type { Installment, Payment, PaymentPlan } from '../domain/finance/types.ts';
import type { Voucher } from '../domain/finance/voucher.ts';
import type {
  Consent,
  Guardianship,
  Person,
  PersonRole,
  Registration,
} from '../domain/types.ts';
import type {
  ConsentRow,
  PaymentInstallmentRow,
  PaymentPlanRow,
  PaymentRow,
  RegistrationVoucherRow,
  GuardianshipRow,
  PersonRoleRow,
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

export function toPersonRole(row: PersonRoleRow): PersonRole {
  return {
    personId: row.person_id,
    seasonId: row.season_id,
    role: row.role,
  };
}

export function toInstallment(row: PaymentInstallmentRow): Installment {
  return {
    sequence: row.sequence,
    dueOn: row.due_on,
    amountCents: row.amount_cents,
  };
}

export function toPaymentPlan(
  row: PaymentPlanRow,
  installments: readonly PaymentInstallmentRow[],
): PaymentPlan {
  return {
    id: row.id,
    registrationId: row.registration_id,
    totalCents: row.total_cents,
    cadence: row.cadence,
    installments: installments
      .filter((i) => i.payment_plan_id === row.id)
      .map(toInstallment)
      .sort((a, b) => a.sequence - b.sequence),
    cancelledAt: row.cancelled_at,
  };
}

export function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    registrationId: row.registration_id,
    amountCents: row.amount_cents,
    receivedOn: row.received_on,
    method: row.method,
    reference: row.reference,
    reversesPaymentId: row.reverses_payment_id,
  };
}

export function toVoucher(row: RegistrationVoucherRow): Voucher {
  return {
    id: row.id,
    registrationId: row.registration_id,
    program: row.program,
    code: row.code,
    faceValueCents: row.face_value_cents,
    state: row.state,
    filePath: row.file_path,
    attachedAt: row.attached_at,
    verifiedAt: row.verified_at,
    rejectionReason: row.rejection_reason,
    reliefPaymentId: row.relief_payment_id,
  };
}
