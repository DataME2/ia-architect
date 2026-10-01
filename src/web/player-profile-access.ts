import { DEFAULT_TIME_ZONE, todayIn } from './today.ts';

/**
 * Who may write a player's profile (BR99, BR125), and so who sees its form.
 *
 * The database decides: `player_profile_manage` names these roles, and a
 * save by anyone else is refused. This list only spares everyone else a
 * form that cannot save (BR156, scope 70). It is a copy of the policy's
 * role list (`player_profile_manage`, last set in migration 0058): change both together.
 */
export const PLAYER_PROFILE_WRITERS: readonly string[] = [
  'admin',
  'registrar',
  'coordinator',
  'coach',
  'technical_director',
  'digital_technology_manager',
  'program_coordinator',
];

/** Whether any of the viewer's club roles may record the player's profile. */
export function canWritePlayerProfile(roles: readonly string[]): boolean {
  return roles.some((role) => PLAYER_PROFILE_WRITERS.includes(role));
}

/**
 * Who may attach, replace or remove the identification photograph: the
 * admin and registrar (BR157; the storage write policies, migration 0021).
 * More roles may see it than may change it.
 */
export function canUploadPhotograph(roles: readonly string[]): boolean {
  return roles.includes('admin') || roles.includes('registrar');
}

/**
 * Who may record a player's appearance (BR158): the admin, registrar or
 * coordinator, or the player's own coach, which the database works out
 * (`app_coaches_registration`, 0066) and the caller passes in.
 */
export function canRecordAppearance(roles: readonly string[], coachesThePlayer: boolean): boolean {
  return coachesThePlayer || roles.some((r) => r === 'admin' || r === 'registrar' || r === 'coordinator');
}

/**
 * Who recorded an appearance and when (BR101), as the table shows it. An
 * account linked to no Person is named as such, never guessed at, and a row
 * from before the database kept the recorder (null) says that instead. The day is
 * the club's, not the server's: a Brisbane morning is still yesterday in UTC.
 */
export function recorderLabel(
  name: string | null | undefined,
  recordedAt: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const who = name === null ? 'Recorder not on file' : (name ?? 'An account with no linked person');
  return `${who} · ${todayIn(timeZone, new Date(recordedAt))}`;
}
