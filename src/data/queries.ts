/**
 * Typed queries for the registration slice.
 *
 * Every function here takes a request-scoped client, so **Row-Level Security
 * applies to all of it**. The explicit `club_id` filters are belt and braces
 * on top of that, not the mechanism — the mechanism is
 * `supabase/migrations/0002_rls_policies.sql`, and the behavioural proof is
 * `supabase/tests/10_tenant_isolation.sql`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  findDuplicateCandidates,
  findDuplicatePairs,
  type DuplicatePair,
} from '../domain/identity/br5-duplicate-candidates.ts';
import { evaluateRegistration } from '../domain/rules/index.ts';
import { statusFromValidation } from '../domain/rules/registration-status.ts';
import type { RuleOutcome } from '../domain/rules/types.ts';
import type { PackCandidate } from '../domain/submission/types.ts';
import type { Payment, PaymentPlan } from '../domain/finance/types.ts';
import type { IsoDate, Person, RegistrationStatus, SeasonRole } from '../domain/types.ts';
import { buildDirectory, type PersonSummary } from '../web/people-view.ts';
import { displayNameFor, fullLegalName, type QueueEntry } from '../web/queue-view.ts';
import {
  toConsent,
  toGuardianship,
  toPayment,
  toPaymentPlan,
  toPerson,
  toPersonRole,
  toRegistration,
} from './mappers.ts';
import type {
  ClubRow,
  ClubMembershipRow,
  ConsentRow,
  GuardianshipRow,
  MembershipRole,
  PaymentInstallmentRow,
  PaymentPlanRow,
  PaymentRow,
  PersonRoleRow,
  PersonRow,
  RegistrationDocumentRow,
  RegistrationRow,
  SeasonRow,
  ValidationResultRow,
} from './schema.ts';

export interface TenantContext {
  readonly userId: string;
  readonly clubId: string;
  readonly clubName: string;
  /** The first membership row, kept for the screens that show one label. */
  readonly role: MembershipRole;
  /**
   * **Every** role this user holds at this club.
   *
   * A person is routinely both registrar and admin, or both secretary and
   * treasurer — small clubs are small. Gating a screen on `role` alone hid
   * the finance screens from an admin whose registrar membership happened
   * to be the older row, which is a permission decided by insertion order.
   */
  readonly roles: readonly MembershipRole[];
  /**
   * The Person this account belongs to, if an administrator has said so.
   *
   * Null is a real answer, not a missing one (BR108) — an account nobody
   * has linked is the ordinary case, and every screen renders it as
   * unlinked rather than falling back to the email address.
   */
  readonly person: SignedInPerson | null;
}

export interface SignedInPerson {
  readonly personId: string;
  readonly legalName: string;
  readonly preferredName: string | null;
}

/** Thrown when a query fails; carries the table so the page can say where. */
export class QueryError extends Error {
  constructor(table: string, detail: string) {
    super(`${table}: ${detail}`);
    this.name = 'QueryError';
  }
}

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

/**
 * Which club this user acts for.
 *
 * Returns `null` rather than throwing when the user has no membership: under
 * RLS that is indistinguishable from a club that does not exist, which is
 * the correct answer to give a stranger.
 */
export async function loadTenantContext(
  client: SupabaseClient,
  userId: string,
): Promise<TenantContext | null> {
  const memberships = unwrap<ClubMembershipRow[]>(
    'club_membership',
    await client
      .from('club_membership')
      .select('id, club_id, user_id, role, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  );

  let membership = memberships[0];

  if (membership === undefined) {
    // No membership — but there may be one *waiting* for this person, if
    // they were named as a club's responsible party before they had an
    // account (BR95).
    //
    // **Claiming lives here rather than only in the sign-in callback**, and
    // that is the fix for a real failure: the first club provisioned this
    // way had its administrator sign in successfully and end up a member of
    // nothing, because the emailed link came back to the site root instead
    // of `/auth/callback` and the claim never ran. Any route that needs a
    // tenant is now a route that claims one, so access no longer depends on
    // which door somebody came through.
    //
    // Costs one round trip only when there is no membership, which is
    // exactly the case that needs it.
    const { data: claimed } = await client.rpc('claim_club_access');
    if (typeof claimed === 'number' && claimed > 0) {
      const after = unwrap<ClubMembershipRow[]>(
        'club_membership',
        await client
          .from('club_membership')
          .select('id, club_id, user_id, role, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
      );
      membership = after[0];
    }
  }

  if (membership === undefined) return null;

  const clubs = unwrap<ClubRow[]>(
    'club',
    await client
      .from('club')
      .select('id, name, jurisdiction, created_at')
      .eq('id', membership.club_id)
      .limit(1),
  );
  const club = clubs[0];
  if (club === undefined) return null;

  // Who this account *is*, if anybody has recorded it. Asked of the
  // database rather than derived here: `app_who_am_i` checks membership
  // itself, so a club id in the argument cannot reach a link at a club the
  // caller does not belong to.
  let person: SignedInPerson | null = null;
  const { data: whoRows } = await client.rpc('app_who_am_i', { p_club_id: club.id });
  const who = Array.isArray(whoRows) ? whoRows[0] : null;
  if (who != null && typeof who.person_id === 'string' && typeof who.legal_name === 'string') {
    person = {
      personId: who.person_id,
      legalName: who.legal_name,
      preferredName: typeof who.preferred_name === 'string' ? who.preferred_name : null,
    };
  }

  return {
    userId,
    clubId: club.id,
    clubName: club.name,
    role: membership.role,
    roles: memberships
      .filter((m) => m.club_id === membership.club_id)
      .map((m) => m.role),
    person,
  };
}

/**
 * People an account could be linked to, for the access screen's picker.
 *
 * Deliberately thin — `loadPeople` needs a season and builds the whole
 * directory with roles and guardianships, none of which this decides
 * anything with. Merged-away records are excluded, because linking an
 * account to a tombstone would attach an identity to a record BR82 has
 * already retired.
 */
export async function loadLinkCandidates(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly { personId: string; legalName: string; preferredName: string | null }[]> {
  const rows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .is('merged_into_person_id', null)
      .order('legal_family_name', { ascending: true }),
  );

  return rows.map((row) => ({
    personId: row.id,
    legalName: `${row.legal_given_names} ${row.legal_family_name}`.trim(),
    preferredName: row.preferred_name ?? null,
  }));
}

/** Seasons for a club, most recent first. */
export async function loadSeasons(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly SeasonRow[]> {
  return unwrap<SeasonRow[]>(
    'season',
    await client
      .from('season')
      .select('id, club_id, name, starts_on, ends_on, required_document_types, registration_fee_cents')
      .eq('club_id', clubId)
      .order('starts_on', { ascending: false }),
  );
}

interface SliceData {
  readonly registrations: readonly RegistrationRow[];
  readonly people: ReadonlyMap<string, Person>;
  readonly documents: ReadonlyMap<string, RegistrationDocumentRow[]>;
  readonly guardianships: readonly GuardianshipRow[];
  readonly consents: readonly ConsentRow[];
  /** Every person in the club, for BR5 — duplicates are a club-wide question. */
  readonly clubPeople: readonly Person[];
  /** The live payment plan per registration, where one has been agreed. */
  readonly plans: ReadonlyMap<string, PaymentPlan>;
  /** Receipts per registration, oldest first. */
  readonly payments: ReadonlyMap<string, Payment[]>;
}

/**
 * One round trip per table, then joined in memory.
 *
 * Five queries rather than one per registration: a season is ~700 rows for
 * the pilot club, and an N+1 here would be a page that times out in the week
 * it matters most.
 */
async function loadSlice(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<SliceData> {
  const registrations = unwrap<RegistrationRow[]>(
    'registration',
    await client
      .from('registration')
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .eq('club_id', clubId)
      .eq('season_id', seasonId),
  );

  // Merged tombstones are excluded everywhere they would otherwise be
  // matched or listed: a resolved duplicate must not come back as a new one
  // (BR82).
  const clubPersonRows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .is('merged_into_person_id', null),
  );

  const personIds = registrations.map((r) => r.person_id);
  const registrationIds = registrations.map((r) => r.id);

  const documentRows =
    registrationIds.length === 0
      ? []
      : unwrap<RegistrationDocumentRow[]>(
          'registration_document',
          await client
            .from('registration_document')
            .select('id, club_id, registration_id, document_type, storage_path, required, provided_at')
            .eq('club_id', clubId)
            .in('registration_id', registrationIds),
        );

  const guardianships =
    personIds.length === 0
      ? []
      : unwrap<GuardianshipRow[]>(
          'guardianship',
          await client
            .from('guardianship')
            .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
            .eq('club_id', clubId)
            .in('person_id', personIds),
        );

  const consents =
    personIds.length === 0
      ? []
      : unwrap<ConsentRow[]>(
          'consent',
          await client
            .from('consent')
            .select('id, club_id, person_id, purpose, granted_by_person_id, granted_at, revoked_at, channels')
            .eq('club_id', clubId)
            .in('person_id', personIds),
        );

  // BR3 asks whether payment is *in arrears*, not whether a balance exists,
  // so the plan and its receipts have to be here before the rules run.
  const planRows =
    registrationIds.length === 0
      ? []
      : unwrap<PaymentPlanRow[]>(
          'payment_plan',
          await client
            .from('payment_plan')
            .select('id, club_id, registration_id, total_cents, cadence, created_by_user_id, cancelled_at, created_at')
            .eq('club_id', clubId)
            .in('registration_id', registrationIds)
            .is('cancelled_at', null),
        );

  const installmentRows =
    planRows.length === 0
      ? []
      : unwrap<PaymentInstallmentRow[]>(
          'payment_installment',
          await client
            .from('payment_installment')
            .select('id, club_id, payment_plan_id, sequence, due_on, amount_cents')
            .eq('club_id', clubId)
            .in('payment_plan_id', planRows.map((p) => p.id)),
        );

  const paymentRows =
    registrationIds.length === 0
      ? []
      : unwrap<PaymentRow[]>(
          'payment',
          await client
            .from('payment')
            .select('id, club_id, registration_id, amount_cents, received_on, method, reference, reverses_payment_id, recorded_by_user_id, created_at')
            .eq('club_id', clubId)
            .in('registration_id', registrationIds)
            .order('received_on', { ascending: true }),
        );

  const plans = new Map(
    planRows.map((row) => [row.registration_id, toPaymentPlan(row, installmentRows)]),
  );

  const payments = new Map<string, Payment[]>();
  for (const row of paymentRows) {
    const list = payments.get(row.registration_id) ?? [];
    list.push(toPayment(row));
    payments.set(row.registration_id, list);
  }

  const documents = new Map<string, RegistrationDocumentRow[]>();
  for (const row of documentRows) {
    const list = documents.get(row.registration_id) ?? [];
    list.push(row);
    documents.set(row.registration_id, list);
  }

  const clubPeople = clubPersonRows.map(toPerson);
  const people = new Map(clubPeople.map((p) => [p.id, p]));

  return { registrations, people, documents, guardianships, consents, clubPeople, plans, payments };
}

/**
 * The registrar's queue for one season: every registration, evaluated.
 *
 * The rules run here rather than in the database because they are pure
 * functions the architecture can be diffed against
 * (`docs/ea/4_application/2_application-components.md`). What the database
 * holds is the *result* — see `persistValidation`.
 */
export async function loadQueue(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  asAt: IsoDate,
): Promise<readonly QueueEntry[]> {
  const slice = await loadSlice(client, clubId, seasonId);
  const entries: QueueEntry[] = [];

  for (const registrationRow of slice.registrations) {
    const person = slice.people.get(registrationRow.person_id);
    if (person === undefined) continue;

    const registration = toRegistration(
      registrationRow,
      slice.documents.get(registrationRow.id) ?? [],
    );

    const outcomes = evaluateRegistration({
      registration,
      person,
      guardianships: slice.guardianships
        .filter((g) => g.person_id === person.id)
        .map(toGuardianship),
      consents: slice.consents.filter((c) => c.person_id === person.id).map(toConsent),
      paymentPlan: slice.plans.get(registrationRow.id) ?? null,
      payments: slice.payments.get(registrationRow.id) ?? [],
      asAt,
    });

    const duplicates = findDuplicateCandidates(
      person,
      slice.clubPeople.filter((p) => p.id !== person.id),
    );

    entries.push({
      registrationId: registration.id,
      personId: person.id,
      displayName: displayNameFor(person),
      legalName: fullLegalName(person),
      status: registration.status,
      outcomes,
      duplicateCount: duplicates.length,
      outstandingCents: registration.outstandingAmountCents,
    });
  }

  return entries;
}

/**
 * Every candidate for a submission pack, assembled for the pure builder.
 *
 * Loads and joins; it decides nothing. Which candidates are actually
 * included is `buildSubmissionPack`'s call, and keeping that judgement in a
 * pure function is what lets the exclusion rules be tested without a
 * database.
 */
export async function loadPackCandidates(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<readonly PackCandidate[]> {
  const slice = await loadSlice(client, clubId, seasonId);
  const candidates: PackCandidate[] = [];

  for (const registrationRow of slice.registrations) {
    const person = slice.people.get(registrationRow.person_id);
    if (person === undefined) continue;

    const guardianships = slice.guardianships
      .filter((g) => g.person_id === person.id)
      .map(toGuardianship);

    // The guardians themselves are ordinary `person` rows in the same club,
    // so they are already loaded — resolved here rather than re-queried.
    const guardianPeople = guardianships
      .map((g) => slice.people.get(g.guardianPersonId))
      .filter((p): p is Person => p !== undefined);

    candidates.push({
      registration: toRegistration(registrationRow, slice.documents.get(registrationRow.id) ?? []),
      person,
      guardianships,
      guardianPeople,
      consents: slice.consents.filter((c) => c.person_id === person.id).map(toConsent),
      paymentPlan: slice.plans.get(registrationRow.id) ?? null,
      payments: slice.payments.get(registrationRow.id) ?? [],
      duplicateCandidates: findDuplicateCandidates(
        person,
        slice.clubPeople.filter((p) => p.id !== person.id),
      ),
    });
  }

  return candidates;
}

export interface RegistrationDetail {
  readonly entry: QueueEntry;
  readonly person: Person;
  readonly documents: readonly RegistrationDocumentRow[];
  readonly consents: readonly ConsentRow[];
  readonly duplicates: ReturnType<typeof findDuplicateCandidates>;
}

/** One registration, with everything the detail screen needs. */
export async function loadRegistrationDetail(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  registrationId: string,
  asAt: IsoDate,
): Promise<RegistrationDetail | null> {
  const slice = await loadSlice(client, clubId, seasonId);
  const registrationRow = slice.registrations.find((r) => r.id === registrationId);
  if (registrationRow === undefined) return null;

  const person = slice.people.get(registrationRow.person_id);
  if (person === undefined) return null;

  const documents = slice.documents.get(registrationRow.id) ?? [];
  const registration = toRegistration(registrationRow, documents);
  const consents = slice.consents.filter((c) => c.person_id === person.id);

  const outcomes = evaluateRegistration({
    registration,
    person,
    guardianships: slice.guardianships.filter((g) => g.person_id === person.id).map(toGuardianship),
    consents: consents.map(toConsent),
    paymentPlan: slice.plans.get(registrationRow.id) ?? null,
    payments: slice.payments.get(registrationRow.id) ?? [],
    asAt,
  });

  const duplicates = findDuplicateCandidates(
    person,
    slice.clubPeople.filter((p) => p.id !== person.id),
  );

  return {
    entry: {
      registrationId: registration.id,
      personId: person.id,
      displayName: displayNameFor(person),
      legalName: fullLegalName(person),
      status: registration.status,
      outcomes,
      duplicateCount: duplicates.length,
      outstandingCents: registration.outstandingAmountCents,
    },
    person,
    documents,
    consents,
    duplicates,
  };
}

/**
 * Write the evaluated outcomes to `validation_result`.
 *
 * Insert-only by policy — there is no update or delete grant on this table,
 * so history accumulates rather than being overwritten. That is what makes
 * "what was wrong with this in March?" answerable, and what turns open
 * question #32's decomposition into a query rather than a new project.
 */
export async function persistValidation(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  outcomes: readonly RuleOutcome[],
): Promise<void> {
  if (outcomes.length === 0) return;

  const { error } = await client.from('validation_result').insert(
    outcomes.map((o) => ({
      club_id: clubId,
      registration_id: registrationId,
      rule_id: o.ruleId,
      status: o.status,
      message: o.message,
    })),
  );
  if (error !== null) throw new QueryError('validation_result', error.message);
}

/** The most recent evaluation per rule, for showing history on the detail page. */
export async function loadValidationHistory(
  client: SupabaseClient,
  registrationId: string,
  limit = 50,
): Promise<readonly ValidationResultRow[]> {
  return unwrap<ValidationResultRow[]>(
    'validation_result',
    await client
      .from('validation_result')
      .select('id, club_id, registration_id, rule_id, status, message, evaluated_at')
      .eq('registration_id', registrationId)
      .order('evaluated_at', { ascending: false })
      .limit(limit),
  );
}

/**
 * Record that a registrar checked the legal name against a document (BR55).
 *
 * This is the one field the family cannot fill in for themselves. "We hold a
 * legal name" and "we checked it" are different claims, and only the second
 * survives contact with the federation — so the verification is an act by a
 * club officer, recorded with the time it happened.
 */
export async function verifyLegalName(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  actorUserId: string,
): Promise<void> {
  const verifiedAt = new Date().toISOString();

  const { error } = await client
    .from('person')
    .update({ legal_name_verified_at: verifiedAt })
    .eq('id', personId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('person', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'legal_name_verified',
    entity: 'person',
    entityId: personId,
    detail: { rule: 'BR55', verifiedAt },
  });
}

export interface AuditInput {
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly detail: Record<string, unknown>;
}

/** Append an audit event. Insert-only by policy; never updated or deleted. */
export async function recordAudit(
  client: SupabaseClient,
  clubId: string,
  actorUserId: string | null,
  input: AuditInput,
): Promise<void> {
  const { error } = await client.from('audit_event').insert({
    club_id: clubId,
    actor_user_id: actorUserId,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId,
    detail: input.detail,
  });
  if (error !== null) throw new QueryError('audit_event', error.message);
}

// ------------------------------------------------------ identity & roles

/**
 * Everyone in the club, with the roles they hold in one season.
 *
 * Deliberately keyed on people rather than registrations. A guardian created
 * by a family's public submission has no registration of their own, so a
 * registration-shaped query cannot see them at all — and neither can it show
 * that the coach and the parent are the same Person, which is what P1
 * actually claims.
 */
export async function loadPeople(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  asAt: IsoDate,
): Promise<readonly PersonSummary[]> {
  const personRows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .is('merged_into_person_id', null),
  );

  const roleRows = unwrap<PersonRoleRow[]>(
    'person_role',
    await client
      .from('person_role')
      .select('id, club_id, person_id, season_id, role')
      .eq('club_id', clubId)
      .eq('season_id', seasonId),
  );

  const guardianshipRows = unwrap<GuardianshipRow[]>(
    'guardianship',
    await client
      .from('guardianship')
      .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', clubId),
  );

  return buildDirectory(
    personRows.map(toPerson),
    roleRows.map(toPersonRole),
    guardianshipRows.map(toGuardianship),
    asAt,
  );
}

/**
 * Grant or revoke one season role for one Person (P1).
 *
 * Granting is idempotent: the unique constraint on
 * `(person_id, season_id, role)` makes a second grant a no-op rather than a
 * duplicate, which matters because the surface calling this is a form a
 * registrar can double-submit.
 *
 * Revoking deletes rather than setting an end date. A season role is already
 * scoped to its season, so "held, then not" is fully described by presence —
 * and the audit event is the durable record that it happened.
 */
export async function setSeasonRole(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  seasonId: string,
  role: SeasonRole,
  granted: boolean,
  actorUserId: string,
): Promise<void> {
  if (granted) {
    const { error } = await client
      .from('person_role')
      .upsert(
        { club_id: clubId, person_id: personId, season_id: seasonId, role },
        { onConflict: 'person_id,season_id,role', ignoreDuplicates: true },
      );
    if (error !== null) throw new QueryError('person_role', error.message);
  } else {
    const { error } = await client
      .from('person_role')
      .delete()
      .eq('club_id', clubId)
      .eq('person_id', personId)
      .eq('season_id', seasonId)
      .eq('role', role);
    if (error !== null) throw new QueryError('person_role', error.message);
  }

  await recordAudit(client, clubId, actorUserId, {
    action: granted ? 'season_role_granted' : 'season_role_revoked',
    entity: 'person_role',
    entityId: personId,
    detail: { seasonId, role, principle: 'P1' },
  });
}

// ------------------------------------------ documents, fees, and BR2/BR3

/** The season's registration configuration: the checklist, and the fee. */
export async function updateSeasonRequirements(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  requiredDocumentTypes: readonly string[],
  registrationFeeCents: number,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('season')
    .update({
      required_document_types: [...requiredDocumentTypes],
      registration_fee_cents: registrationFeeCents,
    })
    .eq('id', seasonId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('season', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'season_requirements_updated',
    entity: 'season',
    entityId: seasonId,
    detail: { requiredDocumentTypes, registrationFeeCents, rules: ['BR2', 'BR3'] },
  });
}

/**
 * Mark a required document as received, or take that back.
 *
 * `provided_at` is a time rather than a flag, because "when did the club
 * receive the working-with-children check" is a question a safeguarding
 * audit asks and a boolean cannot answer.
 */
export async function setDocumentProvided(
  client: SupabaseClient,
  clubId: string,
  documentId: string,
  registrationId: string,
  provided: boolean,
  actorUserId: string,
): Promise<void> {
  const providedAt = provided ? new Date().toISOString() : null;

  const { error } = await client
    .from('registration_document')
    .update({ provided_at: providedAt })
    .eq('id', documentId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration_document', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: provided ? 'document_received' : 'document_unreceived',
    entity: 'registration_document',
    entityId: documentId,
    detail: { registrationId, rule: 'BR2', providedAt },
  });
}

/**
 * Copy the season's checklist onto a registration that has none.
 *
 * Registrations created before the checklist existed carry no document rows,
 * so BR2 passes on them for the same vacuous reason it used to pass on
 * everything. The migration deliberately did not backfill them — a
 * requirement a family was never told about should not appear against them
 * overnight — so this is a registrar's explicit act, and it is audited.
 *
 * Returns how many requirements were added.
 */
export async function applySeasonChecklist(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  requiredDocumentTypes: readonly string[],
  actorUserId: string,
): Promise<number> {
  if (requiredDocumentTypes.length === 0) return 0;

  const existing = unwrap<RegistrationDocumentRow[]>(
    'registration_document',
    await client
      .from('registration_document')
      .select('id, club_id, registration_id, document_type, storage_path, required, provided_at')
      .eq('club_id', clubId)
      .eq('registration_id', registrationId),
  );

  const held = new Set(existing.map((d) => d.document_type));
  const missing = requiredDocumentTypes.filter((t) => !held.has(t));
  if (missing.length === 0) return 0;

  const { error } = await client.from('registration_document').insert(
    missing.map((documentType) => ({
      club_id: clubId,
      registration_id: registrationId,
      document_type: documentType,
      required: true,
    })),
  );
  if (error !== null) throw new QueryError('registration_document', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'season_checklist_applied',
    entity: 'registration',
    entityId: registrationId,
    detail: { added: missing, rule: 'BR2' },
  });

  return missing.length;
}

/**
 * Set what a registration still owes (BR3).
 *
 * The amount is set outright rather than decremented by a payment: this
 * slice holds no payment records, and pretending otherwise would build the
 * ledger C3 is meant to own out of a text box. The audit event carries the
 * before and the after, which is the honest version of the same history.
 */
export async function setOutstandingAmount(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  previousCents: number,
  cents: number,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('registration')
    .update({ outstanding_amount_cents: cents })
    .eq('id', registrationId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'outstanding_amount_set',
    entity: 'registration',
    entityId: registrationId,
    detail: { rule: 'BR3', fromCents: previousCents, toCents: cents },
  });
}

/**
 * Move a registration to the status its rule outcomes justify.
 *
 * The status is *derived*, never hand-set — a status a human types drifts
 * from the rules that justify it within a season, and then two screens
 * disagree about the same child. `statusFromValidation` refuses to produce
 * `COMPLETE` or `PENDING_EXTERNAL_REGISTRATION`, which stay the federation's
 * and the pack's to set (BR43, BR60).
 *
 * Returns the status it settled on, whether or not it changed.
 */
export async function applyDerivedStatus(
  client: SupabaseClient,
  clubId: string,
  registrationId: string,
  current: RegistrationStatus,
  outcomes: readonly RuleOutcome[],
  actorUserId: string,
): Promise<RegistrationStatus> {
  const next = statusFromValidation(current, outcomes);
  if (next === current) return current;

  const { error } = await client
    .from('registration')
    .update({ status: next })
    .eq('id', registrationId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('registration', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'registration_status_derived',
    entity: 'registration',
    entityId: registrationId,
    detail: {
      from: current,
      to: next,
      blockedBy: outcomes.filter((o) => o.status === 'fail').map((o) => o.ruleId),
    },
  });

  return next;
}

// --------------------------------------------------------- BR5 / BR82

export interface DuplicateGroup {
  readonly pair: DuplicatePair;
  readonly a: Person;
  readonly b: Person;
  /** How much each side would bring with it, so the choice is informed. */
  readonly aWeight: PersonWeight;
  readonly bWeight: PersonWeight;
}

export interface PersonWeight {
  readonly registrations: number;
  readonly children: number;
  readonly roles: number;
  readonly createdAt: string;
}

/**
 * Every unresolved duplicate in the club, for a human to decide.
 *
 * Club-wide rather than per registration, because the per-registration view
 * structurally cannot see the worst case: a guardian has no registration of
 * their own, so four copies of one parent appeared on no screen at all —
 * which is how they got to four.
 *
 * Merged records are excluded. A tombstone is a resolved duplicate, and
 * showing it again would ask the registrar the same question forever.
 */
export async function loadDuplicates(
  client: SupabaseClient,
  clubId: string,
): Promise<readonly DuplicateGroup[]> {
  const personRows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .is('merged_into_person_id', null),
  );

  const people = personRows.map(toPerson);
  const pairs = findDuplicatePairs(people);
  if (pairs.length === 0) return [];

  const byId = new Map(people.map((p) => [p.id, p]));
  const createdAt = new Map(personRows.map((r) => [r.id, r.created_at]));

  const involved = [...new Set(pairs.flatMap((p) => [p.aId, p.bId]))];

  const registrations = unwrap<RegistrationRow[]>(
    'registration',
    await client
      .from('registration')
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .eq('club_id', clubId)
      .in('person_id', involved),
  );

  const guardianships = unwrap<GuardianshipRow[]>(
    'guardianship',
    await client
      .from('guardianship')
      .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', clubId),
  );

  const roles = unwrap<PersonRoleRow[]>(
    'person_role',
    await client
      .from('person_role')
      .select('id, club_id, person_id, season_id, role')
      .eq('club_id', clubId)
      .in('person_id', involved),
  );

  const weigh = (personId: string): PersonWeight => ({
    registrations: registrations.filter((r) => r.person_id === personId).length,
    children: guardianships.filter((g) => g.guardian_person_id === personId).length,
    roles: roles.filter((r) => r.person_id === personId).length,
    createdAt: createdAt.get(personId) ?? '',
  });

  const groups: DuplicateGroup[] = [];
  for (const pair of pairs) {
    const a = byId.get(pair.aId);
    const b = byId.get(pair.bId);
    if (a === undefined || b === undefined) continue;
    groups.push({ pair, a, b, aWeight: weigh(a.id), bWeight: weigh(b.id) });
  }
  return groups;
}

/**
 * Fold one Person into another (BR82).
 *
 * The decision is the registrar's; this only carries it out. The database
 * function repoints every reference in one transaction and leaves the
 * duplicate as a tombstone pointing at the survivor — never a delete, so a
 * stale link still resolves and the merge stays auditable.
 */
export async function mergePerson(
  client: SupabaseClient,
  survivorId: string,
  duplicateId: string,
): Promise<void> {
  const { error } = await client.rpc('merge_person', {
    p_survivor_id: survivorId,
    p_duplicate_id: duplicateId,
  });
  if (error !== null) throw new QueryError('merge_person', error.message);
}
