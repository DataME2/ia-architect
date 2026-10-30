import type { SupabaseClient } from '@supabase/supabase-js';

import type { AppointmentState } from '../web/official-figures.ts';

/** One appointment of one official at this club, with its fixture (scope 126). */
export interface OfficialAppointment {
  readonly id: string;
  readonly role: string;
  readonly state: AppointmentState;
  readonly reason: string | null;
  readonly appointedBy: string;
  readonly playedOn: string;
  readonly kickOff: string | null;
  readonly opponent: string;
  readonly competition: string | null;
  readonly homeAway: string;
  readonly fixtureStatus: string;
}

/**
 * Every appointment of `personId` at `clubId`, newest fixture first. Read
 * under the appointment table's policy, which shows it to the club's
 * appointing roles (P5); nothing here widens that.
 */
export async function loadOfficialAppointments(
  client: SupabaseClient,
  clubId: string,
  personId: string,
): Promise<OfficialAppointment[]> {
  const { data, error } = await client
    .from('match_official_appointment')
    .select('id, role, state, reason, appointed_by, fixture:fixture_id(played_on, kick_off, opponent, competition, home_away, status)')
    .eq('club_id', clubId)
    .eq('person_id', personId);
  if (error !== null || data === null) return [];
  return (data as unknown as Record<string, unknown>[])
    .map((r) => {
      const f = (r.fixture ?? {}) as Record<string, unknown>;
      return {
        id: String(r.id),
        role: String(r.role),
        state: String(r.state) as AppointmentState,
        reason: r.reason === null ? null : String(r.reason),
        appointedBy: String(r.appointed_by),
        playedOn: String(f.played_on ?? ''),
        kickOff: f.kick_off === null || f.kick_off === undefined ? null : String(f.kick_off),
        opponent: String(f.opponent ?? ''),
        competition: f.competition === null || f.competition === undefined ? null : String(f.competition),
        homeAway: String(f.home_away ?? ''),
        fixtureStatus: String(f.status ?? 'scheduled'),
      };
    })
    .sort((a, b) => b.playedOn.localeCompare(a.playedOn));
}
