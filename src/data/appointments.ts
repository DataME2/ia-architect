/**
 * Club functions and the access appointments carry (scope 68, BR153/BR154).
 *
 * Every write goes through a policy or a `security definer` function that
 * checks admin-or-current-President itself; nothing here is the control.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  isFunctionKind,
  type AccessMapEntry,
  type AppointmentAccess,
  type FunctionAppointment,
} from '../web/appointment-view.ts';
import { QueryError } from './queries.ts';

interface FunctionAppointmentRow {
  id: string;
  person_id: string;
  kind: string;
  starts_on: string;
  ends_on: string | null;
}

interface AppointmentAccessRow {
  id: string;
  person_id: string;
  email: string;
  access_role: string;
  committee_position_id: string | null;
  function_appointment_id: string | null;
  confirmed_at: string;
  claimed_user_id: string | null;
  claimed_at: string | null;
}

export async function loadFunctionAppointments(
  client: SupabaseClient,
  clubId: string,
): Promise<FunctionAppointment[]> {
  const { data, error } = await client
    .from('club_function_appointment')
    .select('id, person_id, kind, starts_on, ends_on')
    .eq('club_id', clubId)
    .order('starts_on', { ascending: false });
  if (error !== null) throw new QueryError('club_function_appointment', error.message);
  return ((data ?? []) as FunctionAppointmentRow[])
    .filter((r) => isFunctionKind(r.kind))
    .map((r) => ({
      id: r.id,
      personId: r.person_id,
      kind: r.kind as FunctionAppointment['kind'],
      startsOn: r.starts_on,
      endsOn: r.ends_on,
    }));
}

export async function loadAppointmentAccess(
  client: SupabaseClient,
  clubId: string,
): Promise<AppointmentAccess[]> {
  const { data, error } = await client
    .from('appointment_access')
    .select('*')
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('appointment_access', error.message);
  return ((data ?? []) as AppointmentAccessRow[]).map((r) => ({
    id: r.id,
    personId: r.person_id,
    email: r.email,
    accessRole: r.access_role,
    committeePositionId: r.committee_position_id,
    functionAppointmentId: r.function_appointment_id,
    confirmedAt: r.confirmed_at,
    claimedUserId: r.claimed_user_id,
    claimedAt: r.claimed_at,
  }));
}

export async function loadAccessMap(client: SupabaseClient): Promise<AccessMapEntry[]> {
  const { data, error } = await client.rpc('app_appointment_access_map');
  if (error !== null) throw new QueryError('app_appointment_access_map', error.message);
  return ((data ?? []) as { source: 'office' | 'function'; value: string; access_role: string }[]).map(
    (r) => ({ source: r.source, value: r.value, accessRole: r.access_role }),
  );
}

export async function mayConfirmAppointments(
  client: SupabaseClient,
  clubId: string,
): Promise<boolean> {
  const { data } = await client.rpc('app_may_confirm_appointments', { p_club: clubId });
  return data === true;
}

/** The ids of people whose accounts are linked, and so need no link sent. */
export async function loadLinkedPersonIds(
  client: SupabaseClient,
  clubId: string,
): Promise<Set<string>> {
  const { data, error } = await client
    .from('account_person')
    .select('person_id')
    .eq('club_id', clubId);
  if (error !== null) throw new QueryError('account_person', error.message);
  return new Set(((data ?? []) as { person_id: string }[]).map((r) => r.person_id));
}

export async function appointFunction(
  client: SupabaseClient,
  clubId: string,
  personId: string,
  kind: string,
  startsOn: string,
): Promise<void> {
  const { error } = await client
    .from('club_function_appointment')
    .insert({ club_id: clubId, person_id: personId, kind, starts_on: startsOn });
  if (error !== null) throw new QueryError('club_function_appointment', error.message);
}

export async function endFunction(
  client: SupabaseClient,
  clubId: string,
  appointmentId: string,
  endsOn: string,
): Promise<void> {
  const { error } = await client
    .from('club_function_appointment')
    .update({ ends_on: endsOn })
    .eq('club_id', clubId)
    .eq('id', appointmentId);
  if (error !== null) throw new QueryError('club_function_appointment', error.message);
}

export type ConfirmOutcome =
  | { readonly kind: 'granted'; readonly accessRole: string }
  | { readonly kind: 'invited'; readonly email: string; readonly accessRole: string };

export async function confirmAppointmentAccess(
  client: SupabaseClient,
  target: { readonly positionId: string } | { readonly functionId: string },
): Promise<ConfirmOutcome> {
  const { data, error } = await client.rpc('confirm_appointment_access', {
    p_committee_position_id: 'positionId' in target ? target.positionId : null,
    p_function_appointment_id: 'functionId' in target ? target.functionId : null,
  });
  if (error !== null) throw new QueryError('confirm_appointment_access', error.message);
  const row = ((data ?? []) as { outcome: string; sent_to: string; grants: string }[])[0];
  if (row === undefined) throw new QueryError('confirm_appointment_access', 'returned nothing');
  return row.outcome === 'granted'
    ? { kind: 'granted', accessRole: row.grants }
    : { kind: 'invited', email: row.sent_to, accessRole: row.grants };
}
