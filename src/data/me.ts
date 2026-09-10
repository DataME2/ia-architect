/**
 * What the signed-in account is, across every club it is linked at, and
 * the reads each role's workspace needs.
 *
 * The role list is **derived, never stored** (scope 32): it is a lens over
 * `account_person`, `person_role`, `guardianship`, `team_member` and
 * `club_membership`, all of which already answer the question. Nothing in
 * here writes.
 *
 * Every query runs as the signed-in user, so RLS applies. Where a table is
 * readable only by club officers — the whole referee record is, today — a
 * workspace gets an empty list rather than an error, and says so.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { governingTerm, termStatus } from '../domain/governance/term.ts';
import type { Person } from '../domain/types.ts';
import { guardianScope, type FixtureLike } from '../web/me-view.ts';
import { displayNameFor, fullLegalName } from '../web/queue-view.ts';
import { buildContexts, type RoleHolding, type RoleKey } from '../web/role-context.ts';
import { loadGovernance } from './governance.ts';
import { toPerson } from './mappers.ts';
import { QueryError } from './queries.ts';
import type {
  ClubMembershipRow,
  ClubRow,
  ConsentRow,
  FixtureRow,
  GuardianshipRow,
  MembershipRole,
  PersonRoleRow,
  PersonRow,
  RegistrationRow,
  SeasonRow,
  TeamMemberRow,
  TeamRow,
} from './schema.ts';

function unwrap<T>(table: string, result: { data: T | null; error: { message: string } | null }): T {
  if (result.error !== null) throw new QueryError(table, result.error.message);
  if (result.data === null) throw new QueryError(table, 'returned no data');
  return result.data;
}

/** One club this account is linked to a Person at. */
export interface ClubLink {
  readonly clubId: string;
  readonly clubName: string;
  readonly personId: string;
  readonly person: Person;
  /** The latest season, or null for a club with none configured. */
  readonly season: SeasonRow | null;
  readonly membershipRoles: readonly MembershipRole[];
}

export interface MeSnapshot {
  readonly userId: string;
  /**
   * Any access at all — a club_membership row, an account_person link, or
   * both. Without either, RLS shows nothing and there is no lens.
   *
   * **Not the same question as "is this account a club officer."** A
   * guardian invited under scope 35's WP4 holds an account_person link and
   * deliberately no club_membership row (decision 11) — `hasAccess` is true
   * for them, `isClubOfficer` is false. The field kept its old name
   * (`hasMembership`) once too, when membership was the only door; it is
   * renamed because that stopped being true in migration 0028.
   */
  readonly hasAccess: boolean;
  /** The Person, from the first linked club. Null is BR108's honest answer. */
  readonly person: { readonly name: string; readonly legalName: string } | null;
  readonly links: readonly ClubLink[];
  readonly holdings: readonly RoleHolding[];
  /** Whether any membership is a club-officer role, for the way to `/registrar`. */
  readonly isClubOfficer: boolean;
}

const OFFICER_ROLES: readonly MembershipRole[] = [
  'admin',
  'registrar',
  'treasurer',
  'committee',
  'coach',
  'coordinator',
];

export async function loadMe(client: SupabaseClient, userId: string, today: string): Promise<MeSnapshot> {
  const memberships = unwrap<ClubMembershipRow[]>(
    'club_membership',
    await client.from('club_membership').select('id, club_id, user_id, role, created_at').eq('user_id', userId),
  );

  // A guardian invited under WP4 holds an account_person link and no
  // club_membership row at all (decision 11) — reading this unconditionally
  // is the fix for a bug that quietly meant "only a club officer has a
  // workspace": the row this reads has its own select policy
  // (account_person_select_own) that needs no membership either.
  const linkRows = unwrap<{ club_id: string; person_id: string }[]>(
    'account_person',
    await client.from('account_person').select('club_id, person_id').eq('user_id', userId),
  );

  if (memberships.length === 0 && linkRows.length === 0) {
    return { userId, hasAccess: false, person: null, links: [], holdings: [], isClubOfficer: false };
  }

  const clubIds = [...new Set(linkRows.map((l) => l.club_id))];
  const clubs =
    clubIds.length === 0
      ? []
      : unwrap<ClubRow[]>('club', await client.from('club').select('id, name, jurisdiction, created_at').in('id', clubIds));
  const clubName = new Map(clubs.map((c) => [c.id, c.name]));

  const links: ClubLink[] = [];
  const holdings: RoleHolding[] = [];

  for (const link of linkRows) {
    const name = clubName.get(link.club_id);
    if (name === undefined) continue;

    const personRows = unwrap<PersonRow[]>(
      'person',
      await client.from('person').select('*').eq('club_id', link.club_id).eq('id', link.person_id).limit(1),
    );
    const personRow = personRows[0];
    if (personRow === undefined) continue;
    const person = toPerson(personRow);

    const seasons = unwrap<SeasonRow[]>(
      'season',
      await client
        .from('season')
        .select('id, club_id, name, starts_on, ends_on, required_document_types, registration_fee_cents')
        .eq('club_id', link.club_id)
        .order('starts_on', { ascending: false })
        .limit(1),
    );
    const season = seasons[0] ?? null;
    const membershipRoles = memberships.filter((m) => m.club_id === link.club_id).map((m) => m.role);

    links.push({ clubId: link.club_id, clubName: name, personId: link.person_id, person, season, membershipRoles });

    // --- which roles, at this club, this season -------------------------
    const roleKeys = new Set<RoleKey>();
    if (season !== null) {
      const roles = unwrap<PersonRoleRow[]>(
        'person_role',
        await client
          .from('person_role')
          .select('id, club_id, person_id, season_id, role')
          .eq('club_id', link.club_id)
          .eq('person_id', link.person_id)
          .eq('season_id', season.id),
      );
      for (const r of roles) roleKeys.add(r.role);
    }
    // Committee is also a membership role, and an admin sits on it by
    // definition — a club's first administrator is usually its secretary.
    if (membershipRoles.some((r) => r === 'committee' || r === 'admin')) roleKeys.add('committee');

    // Guardianship is a fact about people, not a season role: a parent is a
    // parent in the off-season too.
    const guardianships = unwrap<GuardianshipRow[]>(
      'guardianship',
      await client
        .from('guardianship')
        .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
        .eq('club_id', link.club_id)
        .eq('guardian_person_id', link.person_id)
        .eq('is_authority', true),
    );
    if (guardianships.length > 0) roleKeys.add('guardian');

    // --- scope and pending, per role -------------------------------------
    const teams = await loadMyTeams(client, link.club_id, season?.id ?? null, link.person_id);
    const coachTeam = teams.find((t) => t.role !== 'player');
    const playerTeam = teams.find((t) => t.role === 'player');

    let childNames: string[] = [];
    let guardianPending = 0;
    if (roleKeys.has('guardian')) {
      const children = await loadChildren(client, link.club_id, link.person_id);
      childNames = children.map(displayNameFor);
      if (season !== null && children.length > 0) {
        const regs = unwrap<RegistrationRow[]>(
          'registration',
          await client
            .from('registration')
            .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
            .eq('club_id', link.club_id)
            .eq('season_id', season.id)
            .in('person_id', children.map((c) => c.id)),
        );
        guardianPending = regs.filter((r) => r.status !== 'COMPLETE').length;
      }
    }

    let committeeScope: string | null = null;
    let committeePending = 0;
    if (roleKeys.has('committee')) {
      const governance = await loadGovernance(client, link.club_id);
      const term = governingTerm(governance.terms, today);
      if (term !== null) {
        const mine = governance.members.find(
          (m) => m.termId === term.id && m.personId === link.person_id && m.resignedOn === null,
        );
        committeeScope = mine === undefined ? null : titleCase(mine.position);
        committeePending = termStatus(term, today) === 'overdue' ? 1 : 0;
      }
    }

    const scopeFor: Record<RoleKey, string | null> = {
      player: playerTeam?.team.name ?? null,
      coach: coachTeam?.team.name ?? null,
      referee: null,
      guardian: guardianScope(childNames),
      committee: committeeScope,
    };
    const pendingFor: Record<RoleKey, number> = {
      player: 0,
      coach: 0,
      referee: 0,
      guardian: guardianPending,
      committee: committeePending,
    };

    for (const key of roleKeys) {
      holdings.push({
        key,
        clubId: link.club_id,
        clubName: name,
        scope: scopeFor[key],
        pending: pendingFor[key],
      });
    }
  }

  const first = links[0];
  return {
    userId,
    hasAccess: true,
    person: first === undefined ? null : { name: displayNameFor(first.person), legalName: fullLegalName(first.person) },
    links,
    holdings: buildContexts(holdings),
    isClubOfficer: memberships.some((m) => OFFICER_ROLES.includes(m.role)),
  };
}

function titleCase(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─────────────────────────────── per-workspace reads ─────────────────── */

export interface MyTeam {
  readonly team: TeamRow;
  readonly role: TeamMemberRow['role'];
}

export async function loadMyTeams(
  client: SupabaseClient,
  clubId: string,
  seasonId: string | null,
  personId: string,
): Promise<readonly MyTeam[]> {
  if (seasonId === null) return [];
  const members = unwrap<TeamMemberRow[]>(
    'team_member',
    await client.from('team_member').select('*').eq('club_id', clubId).eq('person_id', personId),
  );
  if (members.length === 0) return [];
  const teams = unwrap<TeamRow[]>(
    'team',
    await client
      .from('team')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .in('id', members.map((m) => m.team_id)),
  );
  return members.flatMap((m) => {
    const team = teams.find((t) => t.id === m.team_id);
    return team === undefined ? [] : [{ team, role: m.role }];
  });
}

export async function loadTeamFixtures(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  teamId: string,
): Promise<readonly FixtureLike[]> {
  const rows = unwrap<FixtureRow[]>(
    'fixture',
    await client
      .from('fixture')
      .select('*')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .eq('team_id', teamId)
      .order('played_on', { ascending: true }),
  );
  return rows.map((f) => ({
    id: f.id,
    playedOn: f.played_on,
    opponent: f.opponent,
    homeAway: f.home_away,
    venue: f.venue,
    competition: f.competition,
    status: f.status,
  }));
}

export async function loadMyRegistration(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  personId: string,
): Promise<RegistrationRow | null> {
  const rows = unwrap<RegistrationRow[]>(
    'registration',
    await client
      .from('registration')
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .eq('person_id', personId)
      .limit(1),
  );
  return rows[0] ?? null;
}

export interface RosterEntry {
  readonly person: Person;
  readonly role: TeamMemberRow['role'];
  readonly registration: RegistrationRow | null;
}

/** Everyone on a team, with each player's registration this season. */
export async function loadRoster(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  teamId: string,
): Promise<readonly RosterEntry[]> {
  const members = unwrap<TeamMemberRow[]>(
    'team_member',
    await client.from('team_member').select('*').eq('club_id', clubId).eq('team_id', teamId),
  );
  if (members.length === 0) return [];
  const ids = members.map((m) => m.person_id);
  const [people, regs] = await Promise.all([
    client.from('person').select('*').eq('club_id', clubId).in('id', ids),
    client
      .from('registration')
      .select('id, club_id, person_id, season_id, status, outstanding_amount_cents, created_at')
      .eq('club_id', clubId)
      .eq('season_id', seasonId)
      .in('person_id', ids),
  ]);
  const personRows = unwrap<PersonRow[]>('person', people);
  const regRows = unwrap<RegistrationRow[]>('registration', regs);
  return members.flatMap((m) => {
    const row = personRows.find((p) => p.id === m.person_id);
    if (row === undefined) return [];
    return [
      {
        person: toPerson(row),
        role: m.role,
        registration: regRows.find((r) => r.person_id === m.person_id) ?? null,
      },
    ];
  });
}

/** The children this person holds authority for (BR63, BR67). */
export async function loadChildren(
  client: SupabaseClient,
  clubId: string,
  guardianPersonId: string,
): Promise<readonly Person[]> {
  const rows = unwrap<GuardianshipRow[]>(
    'guardianship',
    await client
      .from('guardianship')
      .select('id, club_id, person_id, guardian_person_id, is_authority, is_contact')
      .eq('club_id', clubId)
      .eq('guardian_person_id', guardianPersonId)
      .eq('is_authority', true),
  );
  if (rows.length === 0) return [];
  const people = unwrap<PersonRow[]>(
    'person',
    await client
      .from('person')
      .select('*')
      .eq('club_id', clubId)
      .in('id', rows.map((r) => r.person_id))
      .is('merged_into_person_id', null),
  );
  return people.map(toPerson);
}

export async function loadConsents(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<readonly ConsentRow[]> {
  return unwrap<ConsentRow[]>(
    'consent',
    await client.from('consent').select('*').eq('club_id', clubId).eq('person_id', personId),
  );
}

/**
 * The official's own record — profile, appointments, declared availability.
 *
 * **Readable today only by admin, registrar and coordinator** (migrations
 * 0023–0025). An official signed in as themselves gets an empty answer from
 * RLS, which is the correct answer under P5 until a policy says otherwise —
 * and the workspace says so rather than rendering an empty list as "none".
 */
export async function loadOfficialSelfView(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<{ readonly visible: boolean; readonly appointments: number; readonly windows: number }> {
  const [profile, appointments, windows] = await Promise.all([
    client.from('referee_profile').select('id').eq('club_id', clubId).eq('person_id', personId).limit(1),
    client
      .from('match_official_appointment')
      .select('id')
      .eq('club_id', clubId)
      .eq('person_id', personId)
      .in('state', ['proposed', 'accepted']),
    client.from('referee_availability').select('id').eq('club_id', clubId).eq('person_id', personId),
  ]);
  const visible = (profile.data?.length ?? 0) > 0;
  return {
    visible,
    appointments: appointments.data?.length ?? 0,
    windows: windows.data?.length ?? 0,
  };
}

/** Vouchers attached and waiting for a treasurer's verification (BR21, BR78). */
export async function countVouchersAwaiting(client: SupabaseClient, clubId: string): Promise<number> {
  const { data } = await client
    .from('registration_voucher')
    .select('id')
    .eq('club_id', clubId)
    .eq('status', 'ATTACHED');
  return data?.length ?? 0;
}
