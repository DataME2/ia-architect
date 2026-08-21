/**
 * Who governs this club, and until when.
 *
 * Reading is open to every club member: a registrar chasing BR21's
 * "Committee approved this voucher program" needs to be able to see who the
 * Committee actually is. Changing it is governance, so only an admin.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  CommitteeMember,
  CommitteePosition,
  CommitteeTerm,
} from '../domain/governance/term.ts';
import type { IsoDate, Person } from '../domain/types.ts';
import { toCommitteeMember, toCommitteeTerm, toPerson } from './mappers.ts';
import { QueryError, recordAudit } from './queries.ts';
import type { CommitteePositionRow, CommitteeTermRow, PersonRow } from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

export interface Governance {
  readonly terms: readonly CommitteeTerm[];
  readonly members: readonly CommitteeMember[];
  readonly people: ReadonlyMap<string, Person>;
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

  return {
    terms: termRows.map(toCommitteeTerm),
    members: positionRows.map(toCommitteeMember),
    people: new Map(personRows.map((row) => [row.id, toPerson(row)])),
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
