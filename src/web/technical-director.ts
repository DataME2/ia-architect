/**
 * The Technical Director's workspace decisions (scope 98, BR176, BR177).
 *
 * `TD_PERMISSIONS` is the role's access **written down once**, so the
 * workspace can show it and a reviewer can check it against the policies
 * it restates. Each row names where the database enforces it; the database
 * remains the authority, and a row here that disagreed with it would be a
 * bug in this list, not a grant. Adjust here and in the policy together.
 */

export interface Permission {
  readonly area: string;
  readonly may: string;
  /** The rule, and where it is enforced. */
  readonly source: string;
}

export const TD_PERMISSIONS: readonly Permission[] = [
  { area: 'Squads and team sheets', may: 'Create teams; add and withdraw players and team officials', source: 'team_manage, team_member_manage' },
  { area: 'Player profile', may: 'Record height, weight, positions, preferred foot and squad number', source: 'BR125, player_profile_manage' },
  { area: 'Player-record corrections', may: 'Confirm or decline a player’s proposed correction to their own record', source: 'BR149, app_review_player_record_correction' },
  { area: 'Appearances', may: 'Correct apps, minutes, goals and assists, record a missing appearance, or remove a wrong one — always naming the source', source: 'BR177, app_correct_appearance' },
  { area: 'Saturday’s answers', may: 'Read who is available for a match or a training night, and the reason a player gave for not being', source: 'BR62, participation_response' },
  { area: 'Training nights', may: 'Add a team’s training nights, once or weekly, and mark who trained', source: 'BR181, BR182, training_session, training_attendance' },
  { area: 'Game days', may: 'Enter a team’s fixtures', source: 'BR181, fixture_manage' },
  { area: 'Academy teams', may: 'Mark a team as academy, so its players of U13 or older are asked to check in', source: 'BR184, app_set_team_academy' },
  { area: 'Daily check-ins', may: 'Read what academy players entered, and the answers listed to follow up — never write them', source: 'BR186, BR187, wellbeing_entry, rpe_entry' },
  { area: 'Player activity', may: 'Read every change to a player in the last 30 days', source: 'BR176, app_player_activity' },
  { area: 'People and registrations', may: 'Read the club’s people and whether each registration is complete', source: 'app_reads_club_wide' },
];

export const TD_NOT_PERMITTED: readonly Permission[] = [
  { area: 'Money', may: 'Balances, payments, plans and vouchers — the verdict "not clear to play", never the amount', source: 'BR78, BR79' },
  { area: 'Committee', may: 'Positions, resolutions and the Management Committee Hub', source: 'BR85, BR123, BR168' },
  { area: 'Clearances', may: 'Working with Children Checks — the Blue Card Administrator’s', source: 'clearance_manage' },
  { area: 'Match officials', may: 'Designations, claims and payments', source: 'BR113, BR117' },
];

/** How each player fact in the activity feed reads. */
const ACTIVITY_PHRASE: Readonly<Record<string, string>> = {
  registration_created: 'was registered',
  public_registration_submitted: 'registered through a public link',
  registration_submitted: 'had their registration submitted',
  registration_status_derived: 'had their registration status change',
  document_received: 'had a document received',
  season_role_granted: 'was given a season role',
  season_role_revoked: 'had a season role removed',
  team_member_added: 'was added to a team sheet',
  team_member_removed: 'was taken off a team sheet',
  'person.details_corrected': 'had their details corrected',
  legal_name_verified: 'had their legal name verified',
  person_merged: 'had a duplicate record merged',
  'player_record_correction.confirmed': 'had their proposed correction confirmed',
  'player_record_correction.declined': 'had their proposed correction declined',
  'appearance.recorded': 'had an appearance recorded',
  'appearance.changed': 'had an appearance corrected',
  'appearance.removed': 'had an appearance removed',
};

export interface ActivityRow {
  readonly occurredAt: string;
  readonly action: string;
  readonly personId: string;
  readonly personName: string;
  readonly actorName: string | null;
}

/** "Riley Striker was added to a team sheet — by Sam Coach". */
export function activityLine(row: ActivityRow): string {
  const what = ACTIVITY_PHRASE[row.action] ?? 'changed';
  return `${row.personName} ${what}${row.actorName === null ? '' : ` — by ${row.actorName}`}`;
}

/** Activity grouped by its UTC calendar day, newest first. */
export function activityByDay(rows: readonly ActivityRow[]): readonly { readonly day: string; readonly rows: readonly ActivityRow[] }[] {
  const days = new Map<string, ActivityRow[]>();
  for (const row of [...rows].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))) {
    const day = row.occurredAt.slice(0, 10);
    days.set(day, [...(days.get(day) ?? []), row]);
  }
  return [...days.entries()].map(([day, r]) => ({ day, rows: r }));
}

/** BR177: a source is at least eight characters once trimmed, at most 500 — 0093's check. */
export function checkCorrectionSource(raw: string): { readonly ok: true; readonly source: string } | { readonly ok: false; readonly error: string } {
  const source = raw.trim();
  if (source.length < 8) {
    return { ok: false, error: 'Name where the correction comes from — the referee’s match report, the result sheet, a video.' };
  }
  if (source.length > 500) return { ok: false, error: 'Keep the source under 500 characters; link to anything longer.' };
  return { ok: true, source };
}
