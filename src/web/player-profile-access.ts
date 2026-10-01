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
