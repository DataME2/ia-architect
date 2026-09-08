/**
 * Assembling a Registration Submission Pack.
 *
 * The pack never ships known-bad data: a registration that fails validation,
 * or that has an unresolved duplicate candidate, is excluded with a reason
 * rather than included with a caveat. A caveat in a spreadsheet is not read.
 */
import { evaluateRegistration } from '../rules/index.ts';
import type { RuleId } from '../rules/types.ts';
import type { Consent, Person } from '../types.ts';
import type {
  ExcludedCandidate, PackCandidate, PackOptions, PackRow, SubmissionPack,
  SubmissionRecord,
} from './types.ts';

function fullLegalName(person: Person): string {
  return `${person.legalName.givenNames} ${person.legalName.familyName}`;
}

/** A live consent covering onward disclosure of the photograph (BR56). */
function photographMayTravel(personId: string, consents: readonly Consent[]): boolean {
  return consents.some(
    (c) =>
      c.personId === personId &&
      c.purpose === 'IDENTIFICATION_PHOTOGRAPH' &&
      c.revokedAt === null,
  );
}

/** The guardian holding authority, if any — the adult the federation can reach. */
function authorityGuardian(candidate: PackCandidate): Person | null {
  const link = candidate.guardianships.find(
    (g) => g.personId === candidate.person.id && g.isAuthority,
  );
  if (link === undefined) return null;
  return candidate.guardianPeople.find((p) => p.id === link.guardianPersonId) ?? null;
}

function toRow(candidate: PackCandidate, options: PackOptions): PackRow {
  const guardian = authorityGuardian(candidate);
  const photoAllowed =
    options.includePhotographs &&
    candidate.person.photoPath !== null &&
    photographMayTravel(candidate.person.id, candidate.consents);

  return {
    personId: candidate.person.id,
    // BR55: the legal name, never the preferred one.
    legalGivenNames: candidate.person.legalName.givenNames,
    legalFamilyName: candidate.person.legalName.familyName,
    dateOfBirth: candidate.person.dateOfBirth,
    email: candidate.person.email,
    guardianLegalName: guardian === null ? null : fullLegalName(guardian),
    guardianEmail: guardian?.email ?? null,
    photoPath: photoAllowed ? candidate.person.photoPath : null,
  };
}

function exclusionFor(
  candidate: PackCandidate,
  options: PackOptions,
): ExcludedCandidate | null {
  const { person, registration } = candidate;

  if (registration.clubId !== options.clubId || person.clubId !== options.clubId) {
    return {
      personId: person.id,
      reason: 'wrong-club',
      ruleIds: [],
      detail: 'Belongs to a different club and cannot appear in this pack.',
    };
  }
  if (registration.seasonId !== options.seasonId) {
    return {
      personId: person.id,
      reason: 'wrong-season',
      ruleIds: [],
      detail: 'Registered for a different season.',
    };
  }
  if (candidate.duplicateCandidates.length > 0) {
    return {
      personId: person.id,
      reason: 'unresolved-duplicate',
      ruleIds: [],
      detail:
        'A possible duplicate is unresolved. Confirm or dismiss it before submitting — ' +
        'sending an unresolved match risks attaching this registration to a different child.',
    };
  }

  const failures = evaluateRegistration({
    registration,
    person,
    guardianships: candidate.guardianships,
    consents: candidate.consents,
    paymentPlan: candidate.paymentPlan,
    payments: candidate.payments,
    asAt: options.asAt,
  }).filter((o) => o.status === 'fail');

  if (failures.length > 0) {
    return {
      personId: person.id,
      reason: 'validation-failed',
      ruleIds: failures.map((f) => f.ruleId) as RuleId[],
      detail: failures.map((f) => f.message).join(' '),
    };
  }
  return null;
}

/**
 * Builds one version of a pack.
 *
 * Pure: the same candidates and options always produce the same pack, which
 * is what makes BR58's "the pack is your evidence of what you sent"
 * meaningful — the artifact can be regenerated and compared.
 */
export function buildSubmissionPack(
  candidates: readonly PackCandidate[],
  options: PackOptions,
): SubmissionPack {
  const rows: PackRow[] = [];
  const excluded: ExcludedCandidate[] = [];

  for (const candidate of candidates) {
    const exclusion = exclusionFor(candidate, options);
    if (exclusion === null) {
      rows.push(Object.freeze(toRow(candidate, options)));
    } else {
      excluded.push(Object.freeze(exclusion));
    }
  }

  return Object.freeze({
    clubId: options.clubId,
    seasonId: options.seasonId,
    version: options.version,
    generatedAt: options.generatedAt,
    generatedByUserId: options.generatedByUserId,
    includesPhotographs: options.includePhotographs,
    rows: Object.freeze(rows),
    manifest: Object.freeze(rows.map((r) => r.personId)),
    excluded: Object.freeze(excluded),
  });
}

/**
 * The submission records a pack produces on handover.
 *
 * Every one starts as `sent` — **never** `confirmed_present` (BR60). Sending
 * is an act by the club; registering is an act by the federation, and only
 * the second creates eligibility.
 */
export function recordsForHandover(pack: SubmissionPack): readonly SubmissionRecord[] {
  return pack.manifest.map((personId) =>
    Object.freeze({
      submissionPackVersion: pack.version,
      personId,
      state: 'sent' as const,
      rejectionReason: null,
    }),
  );
}
