/**
 * Who governs this club, and until when — and what it has decided (BR123).
 *
 * Reading is open to every club member: a registrar chasing BR21's
 * "Committee approved this voucher program" needs to be able to see who the
 * Committee actually is, and now to see the resolution that says so.
 * Changing terms and positions is governance, so only an admin; recording a
 * resolution or enabling a Voucher Program is `admin` or `committee` —
 * Q59's answer, and BR21's gate is the database's own trigger on
 * `registration_voucher`, not a check made here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CommitteeMember,
  CommitteePosition,
  CommitteeResolution,
  CommitteeTerm,
  VoucherProgramEnablement,
} from '../domain/governance/term.ts';
import type { IsoDate, Person } from '../domain/types.ts';
import {
  toCommitteeMember,
  toCommitteeResolution,
  toCommitteeTerm,
  toPerson,
  toVoucherProgramEnablement,
} from './mappers.ts';
import { QueryError, recordAudit } from './queries.ts';
import type {
  ClubVoucherProgramEnablementRow,
  CommitteePositionRow,
  CommitteeResolutionRow,
  CommitteeTermRow,
  PersonRow,
} from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface Governance {
  readonly terms: readonly CommitteeTerm[];
  readonly members: readonly CommitteeMember[];
  readonly people: ReadonlyMap<string, Person>;
  readonly resolutions: readonly CommitteeResolution[];
  readonly voucherPrograms: readonly VoucherProgramEnablement[];
}

export async function loadGovernance(
  client: SupabaseClient,
  clubId: string,
): Promise<Governance> {
  const termRows = unwrap<CommitteeTermRow[]>(
    'committee_term',
    await client
      .from('committee_term')
      .select('*')
      .eq('club_id', clubId)
      .order('starts_on', { ascending: false }),
  );

  const positionRows = unwrap<CommitteePositionRow[]>(
    'committee_position',
    await client.from('committee_position').select('*').eq('club_id', clubId),
  );

  const personIds = [...new Set(positionRows.map((p) => p.person_id))];
  const personRows =
    personIds.length === 0
      ? []
      : unwrap<PersonRow[]>(
          'person',
          await client.from('person').select('*').eq('club_id', clubId).in('id', personIds),
        );

  const resolutionRows = unwrap<CommitteeResolutionRow[]>(
    'committee_resolution',
    await client
      .from('committee_resolution')
      .select('*')
      .eq('club_id', clubId)
      .order('decided_on', { ascending: false }),
  );

  const enablementRows = unwrap<ClubVoucherProgramEnablementRow[]>(
    'club_voucher_program_enablement',
    await client.from('club_voucher_program_enablement').select('*').eq('club_id', clubId),
  );

  return {
    terms: termRows.map(toCommitteeTerm),
    members: positionRows.map(toCommitteeMember),
    people: new Map(personRows.map((row) => [row.id, toPerson(row)])),
    resolutions: resolutionRows.map(toCommitteeResolution),
    voucherPrograms: enablementRows.map(toVoucherProgramEnablement),
  };
}

export type GovernanceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Open a governance year.
 *
 * `nextAgmDueOn` is a date the club states rather than a year computed from
 * the start. A club that holds its AGM late has a committee whose mandate
 * is a real question, and deriving the end date would answer that question
 * silently and wrongly (BR86).
 */
export async function createTerm(
  client: SupabaseClient,
  clubId: string,
  input: {
    readonly name: string;
    readonly agmHeldOn: IsoDate | null;
    readonly startsOn: IsoDate;
    readonly nextAgmDueOn: IsoDate;
  },
  actorUserId: string,
): Promise<GovernanceResult> {
  const { error } = await client.from('committee_term').insert({
    club_id: clubId,
    name: input.name,
    agm_held_on: input.agmHeldOn,
    starts_on: input.startsOn,
    next_agm_due_on: input.nextAgmDueOn,
  });
  if (error !== null) {
    return error.message.includes('committee_term_club_id_name_key')
      ? { ok: false, error: `This club already has a term called ${input.name}.` }
      : { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'committee_term_created',
    entity: 'committee_term',
    entityId: null,
    detail: { ...input, rule: 'BR85' },
  });
  return { ok: true };
}

export async function appointMember(
  client: SupabaseClient,
  clubId: string,
  termId: string,
  personId: string,
  position: CommitteePosition,
  electedOn: IsoDate | null,
  actorUserId: string,
): Promise<GovernanceResult> {
  const { error } = await client.from('committee_position').insert({
    club_id: clubId,
    term_id: termId,
    person_id: personId,
    position,
    elected_on: electedOn,
  });
  if (error !== null) {
    return error.message.includes('committee_position_term_id_person_id_position_key')
      ? { ok: false, error: 'They already hold that position in this term.' }
      : { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'committee_member_appointed',
    entity: 'committee_position',
    entityId: personId,
    detail: { termId, position, electedOn, rule: 'BR85' },
  });
  return { ok: true };
}

/**
 * Record a resignation.
 *
 * Stamped rather than deleted, and distinct from the term ending: BR85 says
 * a position lapses with its term, so leaving early is a different fact and
 * the club's minutes will refer to it as one.
 */
export async function resignMember(
  client: SupabaseClient,
  clubId: string,
  positionId: string,
  resignedOn: IsoDate,
  actorUserId: string,
): Promise<void> {
  const { error } = await client
    .from('committee_position')
    .update({ resigned_on: resignedOn })
    .eq('id', positionId)
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('committee_position', error.message);

  await recordAudit(client, clubId, actorUserId, {
    action: 'committee_member_resigned',
    entity: 'committee_position',
    entityId: positionId,
    detail: { resignedOn, rule: 'BR85' },
  });
}

/**
 * Record a Committee decision (BR123).
 *
 * Append-only, by the database's own absence of an update or delete policy
 * on `committee_resolution` — a corrected decision is recorded as a new
 * resolution, not an old one rewritten, so this module offers no update or
 * delete either.
 */
export async function recordResolution(
  client: SupabaseClient,
  clubId: string,
  input: {
    readonly termId: string;
    readonly decidedOn: IsoDate;
    readonly summary: string;
    readonly movedByPersonId: string | null;
    readonly category: 'general' | 'voucher_program';
  },
  actorUserId: string,
): Promise<GovernanceResult & { readonly id?: string }> {
  const { data, error } = await client
    .from('committee_resolution')
    .insert({
      club_id: clubId,
      term_id: input.termId,
      decided_on: input.decidedOn,
      summary: input.summary,
      moved_by_person_id: input.movedByPersonId,
      category: input.category,
      created_by: actorUserId,
    })
    .select('id')
    .single();
  if (error !== null) {
    return error.message.includes('does not belong to this club')
      ? { ok: false, error: 'That Committee Term does not belong to this club.' }
      : { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'committee_resolution_recorded',
    entity: 'committee_resolution',
    entityId: (data as { id: string }).id,
    detail: { ...input, rule: 'BR123' },
  });
  return { ok: true, id: (data as { id: string }).id };
}

/**
 * Enable a Voucher Program (BR21) — the Committee's approval, made real.
 *
 * The resolution cited must already be recorded with `category:
 * 'voucher_program'`; the database refuses anything else, so the message
 * below is that refusal translated rather than a second check duplicating
 * it.
 */
export async function enableVoucherProgram(
  client: SupabaseClient,
  clubId: string,
  input: { readonly program: string; readonly resolutionId: string },
  actorUserId: string,
): Promise<GovernanceResult> {
  const { error } = await client.from('club_voucher_program_enablement').insert({
    club_id: clubId,
    program: input.program,
    resolution_id: input.resolutionId,
  });
  if (error !== null) {
    if (error.message.includes('club_voucher_program_enablement_club_id_program_key')) {
      return { ok: false, error: `${input.program} is already enabled for this club.` };
    }
    if (error.message.includes('voucher-program decision')) {
      return {
        ok: false,
        error: 'That resolution is not recorded as a voucher-program decision (BR21) — record it with that category first.',
      };
    }
    return { ok: false, error: error.message };
  }

  await recordAudit(client, clubId, actorUserId, {
    action: 'voucher_program_enabled',
    entity: 'club_voucher_program_enablement',
    entityId: null,
    detail: { ...input, rule: 'BR21' },
  });
  return { ok: true };
}
