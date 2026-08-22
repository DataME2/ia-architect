/**
 * Database types for the registration slice.
 *
 * **Hand-written, deliberately.** `supabase gen types` needs credentials for
 * a live project, and CI holds none (see
 * `docs/ea/5_technology/2_deployment.md`). Generating them would either put
 * a credential in CI or leave the checked-in copy unverifiable — so these
 * are written against `supabase/migrations/` and kept true by hand.
 *
 * The rule that keeps that honest: **a migration that changes a column
 * changes this file in the same commit.** `npm run typecheck` then fails
 * every query that assumed the old shape, which is the point.
 */

import type { PackRow } from '../domain/submission/types.ts';
import type { PaymentMethod, PlanCadence } from '../domain/finance/types.ts';
import type { VoucherState } from '../domain/finance/voucher.ts';
import type { TeamRole } from '../domain/teams/types.ts';
import type { CommitteePosition } from '../domain/governance/term.ts';
import type { SeasonRole } from '../domain/types.ts';

/** `YYYY-MM-DD`, as Postgres `date` renders it over the wire. */
export type DateString = string;
/** ISO-8601 instant, as Postgres `timestamptz` renders it over the wire. */
export type InstantString = string;

export type MembershipRole =
  | 'registrar'
  | 'treasurer'
  | 'committee'
  | 'coach'
  | 'coordinator'
  | 'admin';

export type { SeasonRole };

export type ConsentPurposeRow =
  | 'REGISTRATION_COLLECTION_NOTICE'
  | 'IDENTIFICATION_PHOTOGRAPH'
  | 'PUBLICITY';

export type RegistrationStatusRow =
  | 'DRAFT'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_PAYMENT'
  | 'PENDING_EXTERNAL_REGISTRATION'
  | 'COMPLETE';

export type SubmissionStateRow = 'sent' | 'confirmed_present' | 'rejected';

export interface ClubRow {
  id: string;
  name: string;
  jurisdiction: string;
  created_at: InstantString;
}

export interface SeasonRow {
  id: string;
  club_id: string;
  name: string;
  starts_on: DateString;
  ends_on: DateString;
  /** BR2: the checklist copied onto every registration in this season. */
  required_document_types: string[];
  /** BR3: what a registration in this season opens owing. */
  registration_fee_cents: number;
}

export interface PersonRoleRow {
  id: string;
  club_id: string;
  person_id: string;
  season_id: string;
  role: SeasonRole;
}

export interface ClubMembershipRow {
  id: string;
  club_id: string;
  user_id: string;
  role: MembershipRole;
  created_at: InstantString;
}

export interface PersonRow {
  id: string;
  club_id: string;
  legal_given_names: string;
  legal_family_name: string;
  legal_name_verified_at: InstantString | null;
  preferred_name: string | null;
  date_of_birth: DateString;
  email: string | null;
  photo_path: string | null;
  created_at: InstantString;
  /** BR82: set when a human confirmed this record duplicates another. */
  merged_into_person_id: string | null;
}

export interface GuardianshipRow {
  id: string;
  club_id: string;
  person_id: string;
  guardian_person_id: string;
  is_authority: boolean;
  is_contact: boolean;
}

export interface RegistrationRow {
  id: string;
  club_id: string;
  person_id: string;
  season_id: string;
  status: RegistrationStatusRow;
  outstanding_amount_cents: number;
  created_at: InstantString;
}

export interface RegistrationDocumentRow {
  id: string;
  club_id: string;
  registration_id: string;
  document_type: string;
  storage_path: string | null;
  required: boolean;
  provided_at: InstantString | null;
}

export interface ConsentRow {
  id: string;
  club_id: string;
  person_id: string;
  purpose: ConsentPurposeRow;
  granted_by_person_id: string;
  granted_at: InstantString;
  revoked_at: InstantString | null;
  channels: string[];
}

export interface RegistrationInvitationRow {
  id: string;
  club_id: string;
  season_id: string;
  /** BR73: the hash. The token itself is shown once at issue and never stored. */
  token_hash: string;
  label: string;
  expires_at: InstantString;
  revoked_at: InstantString | null;
  use_count: number;
  created_by_user_id: string;
  created_at: InstantString;
}

export interface PaymentPlanRow {
  id: string;
  club_id: string;
  registration_id: string;
  total_cents: number;
  cadence: PlanCadence;
  created_by_user_id: string;
  cancelled_at: InstantString | null;
  created_at: InstantString;
}

export interface PaymentInstallmentRow {
  id: string;
  club_id: string;
  payment_plan_id: string;
  sequence: number;
  due_on: DateString;
  amount_cents: number;
}

export interface PaymentRow {
  id: string;
  club_id: string;
  registration_id: string;
  /** Negative is legitimate: a refund, or a reversing correction (BR77). */
  amount_cents: number;
  received_on: DateString;
  method: PaymentMethod;
  reference: string | null;
  reverses_payment_id: string | null;
  recorded_by_user_id: string;
  created_at: InstantString;
}

export interface RegistrationVoucherRow {
  id: string;
  club_id: string;
  registration_id: string;
  program: string;
  code: string;
  face_value_cents: number;
  state: VoucherState;
  file_path: string | null;
  attached_by_user_id: string;
  attached_at: InstantString;
  verified_by_user_id: string | null;
  verified_at: InstantString | null;
  rejection_reason: string | null;
  /** BR81: set iff relief currently applies. A DB check keeps it honest. */
  relief_payment_id: string | null;
}

export interface TeamRow {
  id: string;
  club_id: string;
  season_id: string;
  name: string;
  age_group: string | null;
  created_at: InstantString;
}

export interface TeamMemberRow {
  id: string;
  club_id: string;
  team_id: string;
  person_id: string;
  role: TeamRole;
  added_by_user_id: string | null;
  added_at: InstantString;
}

export interface ClearanceRow {
  id: string;
  club_id: string;
  person_id: string;
  kind: string;
  identifier: string;
  issued_on: DateString | null;
  expires_on: DateString;
  /** BR19: null means a number was typed and nobody checked it. */
  verified_by_user_id: string | null;
  verified_at: InstantString | null;
  revoked_at: InstantString | null;
  /** BR19: a scan of the card, in the private `clearances` bucket. */
  file_path: string | null;
  created_at: InstantString;
}

export interface CommitteeTermRow {
  id: string;
  club_id: string;
  name: string;
  agm_held_on: DateString | null;
  starts_on: DateString;
  next_agm_due_on: DateString;
  created_at: InstantString;
}

export interface CommitteePositionRow {
  id: string;
  club_id: string;
  term_id: string;
  person_id: string;
  position: CommitteePosition;
  elected_on: DateString | null;
  resigned_on: DateString | null;
  created_at: InstantString;
}

export interface ValidationResultRow {
  id: string;
  club_id: string;
  registration_id: string;
  rule_id: string;
  status: 'pass' | 'fail';
  message: string;
  evaluated_at: InstantString;
}

export interface SubmissionPackRow {
  id: string;
  club_id: string;
  season_id: string;
  version: number;
  generated_at: InstantString;
  generated_by_user_id: string;
  /**
   * BR58: the frozen rows exactly as generated.
   *
   * Typed as the domain's `PackRow` because that is literally what the jsonb
   * holds — the pack's evidence of what was sent, independent of what the
   * `person` rows say now.
   */
  manifest: PackRow[];
  /** Optional archived copy; the manifest is the authoritative record. */
  storage_path: string | null;
  handover_channel: string | null;
  handed_over_at: InstantString | null;
}

export interface SubmissionRecordRow {
  id: string;
  club_id: string;
  submission_pack_id: string;
  person_id: string;
  state: SubmissionStateRow;
  rejection_reason: string | null;
  updated_at: InstantString;
}

export interface AuditEventRow {
  id: string;
  club_id: string;
  actor_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown>;
  occurred_at: InstantString;
}
