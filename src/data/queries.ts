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

import { findDuplicateCandidates } from '../domain/identity/br5-duplicate-candidates.ts';
import { evaluateRegistration } from '../domain/rules/index.ts';
import type { RuleOutcome } from '../domain/rules/types.ts';
import type { PackCandidate } from '../domain/submission/types.ts';
import type { IsoDate, Person } from '../domain/types.ts';
import { displayNameFor, fullLegalName, type QueueEntry } from '../web/queue-view.ts';
import { toConsent, toGuardianship, toPerson, toRegistration } from './mappers.ts';
import type {
  ClubRow,
  ClubMembershipRow,
  ConsentRow,
  GuardianshipRow,
  MembershipRole,
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
  readonly role: MembershipRole;
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
      .order('created_at', { ascending: true })
      .limit(1),
  );

  const membership = memberships[0];
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

  return {
    userId,
    clubId: club.id,
    clubName: club.name,
    role: membership.role,
  };
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
      .select('id, club_id, name, starts_on, ends_on')
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

  const clubPersonRows = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId),
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

  const documents = new Map<string, RegistrationDocumentRow[]>();
  for (const row of documentRows) {
    const list = documents.get(row.registration_id) ?? [];
    list.push(row);
    documents.set(row.registration_id, list);
  }

  const clubPeople = clubPersonRows.map(toPerson);
  const people = new Map(clubPeople.map((p) => [p.id, p]));

  return { registrations, people, documents, guardianships, consents, clubPeople };
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
