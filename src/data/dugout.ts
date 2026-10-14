/**
 * The Team Dugout's reads (scope 99): one team's squad as the pitch needs
 * it. Every read goes through the caller's own policies — a coach reads
 * their team, a Technical Director the club — and a read a role may not
 * make comes back empty rather than failing the page: a coach who cannot
 * read the TD's name still sees the dugout, with the TD unnamed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Person } from '../domain/types.ts';
import { playerStatus, shortName, type DugoutOfficial, type DugoutPlayer, type Position } from '../web/dugout.ts';
import { TEAM_ROLE_LABEL } from '../web/team-view.ts';
import { loadRoster } from './me.ts';
import { loadFixtureParticipationResponses } from './participation.ts';

function nameOf(p: Person): string {
  return `${p.preferredName ?? p.legalName.givenNames} ${p.legalName.familyName}`;
}

export async function loadDugout(
  client: SupabaseClient,
  clubId: string,
  seasonId: string,
  teamId: string,
  /** The next fixture, whose answers colour the shirts (BR62); null when none. */
  fixtureId: string | null,
  today: string,
): Promise<{ readonly players: readonly DugoutPlayer[]; readonly officials: readonly DugoutOfficial[] }> {
  const roster = await loadRoster(client, clubId, seasonId, teamId);
  const squad = roster.filter((r) => r.role === 'player');
  const registrationIds = squad.flatMap((r) => (r.registration === null ? [] : [r.registration.id]));

  const [profiles, responses, functions] = await Promise.all([
    registrationIds.length === 0
      ? Promise.resolve({ data: [] as unknown[] })
      : client
          .from('player_profile')
          .select('registration_id, preferred_position, secondary_position, squad_number')
          .eq('club_id', clubId)
          .in('registration_id', registrationIds),
    fixtureId === null ? Promise.resolve(null) : loadFixtureParticipationResponses(client, clubId, fixtureId).catch(() => null),
    client
      .from('club_function_appointment')
      .select('person_id, kind, starts_on, ends_on')
      .eq('club_id', clubId)
      .eq('kind', 'technical_director'),
  ]);

  const profileBy = new Map(
    ((profiles.data ?? []) as {
      registration_id: string;
      preferred_position: Position | null;
      secondary_position: Position | null;
      squad_number: number | null;
    }[]).map((p) => [p.registration_id, p]),
  );

  const players: DugoutPlayer[] = squad.map((r) => {
    const profile = r.registration === null ? undefined : profileBy.get(r.registration.id);
    const answer = responses?.get(r.person.id) ?? null;
    return {
      id: r.person.id,
      name: nameOf(r.person),
      shortName: shortName(r.person.preferredName ?? r.person.legalName.givenNames, r.person.legalName.familyName),
      number: profile?.squad_number ?? null,
      preferred: profile?.preferred_position ?? null,
      secondary: profile?.secondary_position ?? null,
      status: playerStatus(
        r.registration === null
          ? null
          : {
              status: r.registration.status,
              owes: r.registration.owes,
              hardshipUntil: r.registration.hardship_until,
              owesEarlier: r.registration.owes_earlier ?? false,
            },
      ),
      availability: fixtureId === null || responses === null ? null : answer === null ? 'unanswered' : answer.status,
    };
  });

  // Team officials from the sheet, then the club's current Technical
  // Directors (an appointed function, BR153), named where readable.
  const officials: DugoutOfficial[] = roster
    .filter((r) => r.role !== 'player')
    .map((r) => ({ name: nameOf(r.person), role: TEAM_ROLE_LABEL[r.role] }));
  const tdIds = ((functions.data ?? []) as { person_id: string; starts_on: string; ends_on: string | null }[])
    .filter((f) => f.starts_on <= today && (f.ends_on === null || f.ends_on >= today))
    .map((f) => f.person_id);
  if (tdIds.length > 0) {
    const { data } = await client
      .from('person')
      .select('id, preferred_name, legal_given_names, legal_family_name')
      .eq('club_id', clubId)
      .in('id', tdIds);
    const named = (data ?? []) as { id: string; preferred_name: string | null; legal_given_names: string; legal_family_name: string }[];
    for (const id of tdIds) {
      const p = named.find((n) => n.id === id);
      officials.push({
        name: p === undefined ? 'Technical Director' : `${p.preferred_name ?? p.legal_given_names} ${p.legal_family_name}`,
        role: 'Technical Director',
      });
    }
  }

  return { players, officials };
}
