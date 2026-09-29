/**
 * Appointments and the access they carry (scope 68, BR153/BR154).
 *
 * An office is elected for a term; a club function is appointed and runs
 * until it is ended. Either one carries the access
 * `app_appointment_access_map()` names — the mapping is read from the
 * database rather than restated here, so the screen cannot describe it
 * differently from what the confirm function grants.
 */

export const FUNCTION_KINDS = [
  'it_manager',
  'blue_card_administrator',
  'program_coordinator',
  'referee_coordinator',
  'coach',
  'technical_director',
  'head_of_performance',
  'head_of_community_football',
  'head_of_womens_football',
] as const;

export type FunctionKind = (typeof FUNCTION_KINDS)[number];

export const FUNCTION_LABEL: Readonly<Record<FunctionKind, string>> = {
  it_manager: 'IT Manager',
  blue_card_administrator: 'Blue Card Administrator',
  program_coordinator: 'Program Coordinator',
  referee_coordinator: 'Referee Coordinator',
  coach: 'Coach',
  technical_director: 'Technical Director',
  head_of_performance: 'Head of Performance',
  head_of_community_football: 'Head of Community Football',
  head_of_womens_football: "Head of Women's Football",
};

export function isFunctionKind(value: string): value is FunctionKind {
  return (FUNCTION_KINDS as readonly string[]).includes(value);
}

export interface AccessMapEntry {
  readonly source: 'office' | 'function';
  readonly value: string;
  readonly accessRole: string;
}

/** The access an office or function carries, or null if the map names none. */
export function accessFor(
  map: readonly AccessMapEntry[],
  source: AccessMapEntry['source'],
  value: string,
): string | null {
  return map.find((m) => m.source === source && m.value === value)?.accessRole ?? null;
}

export interface FunctionAppointment {
  readonly id: string;
  readonly personId: string;
  readonly kind: FunctionKind;
  readonly startsOn: string;
  readonly endsOn: string | null;
}

/** Started, and not yet ended. `endsOn` is the last day the function is held. */
export function isCurrentFunction(f: FunctionAppointment, today: string): boolean {
  return f.startsOn <= today && (f.endsOn === null || f.endsOn >= today);
}

/**
 * What each person currently does at the club — office in the governing
 * term (not resigned) and current functions — for the People screen, which
 * is where an admin looks somebody up.
 */
export function appointmentsByPerson(
  offices: readonly { readonly personId: string; readonly termId: string; readonly label: string; readonly resignedOn: string | null }[],
  governingTermId: string | null,
  functions: readonly FunctionAppointment[],
  today: string,
): ReadonlyMap<string, readonly string[]> {
  const out = new Map<string, string[]>();
  const add = (personId: string, label: string) => {
    out.set(personId, [...(out.get(personId) ?? []), label]);
  };
  for (const o of offices) {
    if (o.termId === governingTermId && o.resignedOn === null) add(o.personId, o.label);
  }
  for (const f of functions) {
    if (isCurrentFunction(f, today)) add(f.personId, FUNCTION_LABEL[f.kind]);
  }
  return out;
}

/** One row of `appointment_access`. */
export interface AppointmentAccess {
  readonly id: string;
  readonly personId: string;
  readonly email: string;
  readonly accessRole: string;
  readonly committeePositionId: string | null;
  readonly functionAppointmentId: string | null;
  readonly confirmedAt: string;
  readonly claimedUserId: string | null;
  readonly claimedAt: string | null;
}

export type AccessState =
  | { readonly kind: 'not-confirmed' }
  | { readonly kind: 'link-sent'; readonly to: string; readonly on: string }
  | { readonly kind: 'active'; readonly since: string };

/**
 * Where one appointment's access stands. A confirmation to an account that
 * was already linked is active at once, so "link sent" only ever describes
 * somebody who has not arrived yet.
 */
export function accessState(row: AppointmentAccess | undefined): AccessState {
  if (row === undefined) return { kind: 'not-confirmed' };
  if (row.claimedUserId === null || row.claimedAt === null) {
    return { kind: 'link-sent', to: row.email, on: row.confirmedAt.slice(0, 10) };
  }
  return { kind: 'active', since: row.claimedAt.slice(0, 10) };
}

/** An appointment's access row, described for the Access screen. */
export interface AccessSource {
  readonly accessRole: string;
  readonly claimedUserId: string | null;
  /** "President · 2026–27", "IT Manager". */
  readonly label: string;
  /** The office was resigned or its term superseded, or the function ended. */
  readonly ended: boolean;
}

export type RoleExplanation =
  | { readonly kind: 'granted-by-hand' }
  | { readonly kind: 'appointment'; readonly labels: readonly string[]; readonly allEnded: boolean };

/**
 * Why this account holds this access.
 *
 * BR154 keeps access when its appointment ends, so `allEnded` is the case
 * the screen exists to surface: somebody still holding treasurer access a
 * term after they stopped being Treasurer. An access with no appointment
 * behind it was granted on this screen by hand, which is still allowed.
 */
export function explainRole(
  userId: string,
  accessRole: string,
  sources: readonly AccessSource[],
): RoleExplanation {
  const mine = sources.filter((s) => s.claimedUserId === userId && s.accessRole === accessRole);
  if (mine.length === 0) return { kind: 'granted-by-hand' };
  return {
    kind: 'appointment',
    labels: mine.map((s) => s.label),
    allEnded: mine.every((s) => s.ended),
  };
}
