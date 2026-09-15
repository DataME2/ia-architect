/**
 * Who has access to a club, and what an admin may change about it.
 *
 * Pure, like every other screen decision here: the page renders these
 * answers and makes none of its own.
 */

export const CLUB_ROLES = [
  'admin',
  'registrar',
  'treasurer',
  'committee',
  'coach',
  'coordinator',
] as const;

export type ClubRole = (typeof CLUB_ROLES)[number];

export interface ClubAccount {
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly grantedAt: string;
  /** True for the account doing the looking. */
  readonly isSelf: boolean;
  /**
   * The Person an administrator has said this account belongs to, or null.
   *
   * Null is a real answer and not a missing value (BR108): most accounts
   * will be unlinked for a long time, because linking is deliberate work
   * somebody has to do.
   */
  readonly personId: string | null;
  readonly legalName: string | null;
  readonly preferredName: string | null;
}

/** A Person an account could be linked to. */
export interface LinkCandidate {
  readonly personId: string;
  readonly legalName: string;
  readonly preferredName: string | null;
}

export type AccountIdentity =
  | { readonly kind: 'linked'; readonly display: string; readonly legalName: string }
  | { readonly kind: 'unlinked' };

/**
 * Who this account is, or the honest admission that nobody has said.
 *
 * **There is deliberately no fallback to the email address.** A screen that
 * prints `h.bell@…` where a name belongs makes an unlinked account look
 * linked, and the gap this exists to close becomes invisible again — which
 * is how it survived unnoticed until the permissions were audited. BR108.
 *
 * The preferred name leads where there is one, because it is what a club
 * calls somebody; the legal name is carried alongside rather than replaced,
 * for the same reason BR55 keeps them apart everywhere else.
 */
export function accountIdentity(account: ClubAccount): AccountIdentity {
  if (account.personId === null || account.legalName === null) return { kind: 'unlinked' };

  const preferred = (account.preferredName ?? '').trim();
  return {
    kind: 'linked',
    display: preferred === '' ? account.legalName : preferred,
    legalName: account.legalName,
  };
}

/**
 * The people this account could be linked to.
 *
 * A Person already claimed by *another* account is excluded, because the
 * database refuses it (BR106's reverse direction) and offering an option
 * that will be rejected is the defect WP3 exists for. The account's own
 * current Person stays in the list: re-selecting it is a no-op, and
 * removing it would make the control look like it had forgotten.
 */
export function linkableCandidates(
  account: ClubAccount,
  candidates: readonly LinkCandidate[],
  accounts: readonly ClubAccount[],
): readonly LinkCandidate[] {
  const claimedElsewhere = new Set(
    accounts
      .filter((a) => a.userId !== account.userId && a.personId !== null)
      .map((a) => a.personId as string),
  );
  return candidates.filter((c) => !claimedElsewhere.has(c.personId));
}

/** `Bell, Henry (Harry)` — sorted the way a club reads a list of names. */
export function candidateLabel(candidate: LinkCandidate): string {
  const preferred = (candidate.preferredName ?? '').trim();
  return preferred === '' || preferred === candidate.legalName
    ? candidate.legalName
    : `${candidate.legalName} (${preferred})`;
}

/**
 * What each role actually permits, in one sentence a committee would
 * recognise. Taken from the policies rather than from intent — see
 * `docs/scope/29_actors-access-and-permissions.md` for the full matrix.
 */
export const ROLE_SUMMARY: Record<ClubRole, string> = {
  admin: 'Everything, including who has access and the committee.',
  registrar: 'People, registrations, documents, teams, seasons and submission packs.',
  treasurer: 'Payment plans, payments, and verifying vouchers.',
  committee: 'Reads the club. Writes nothing — the same as coach today.',
  coach: 'Reads the club. Writes nothing — the same as committee today.',
  coordinator: 'Teams and rosters.',
};

/**
 * Roles that currently permit no writing at all.
 *
 * Named rather than hidden, because an admin granting `coach` is entitled
 * to know it does nothing the database can see. Three names share one set
 * of permissions until open questions #58 and #59 are answered.
 */
export const READ_ONLY_ROLES: readonly ClubRole[] = ['committee', 'coach'];

export function isClubRole(value: string): value is ClubRole {
  return (CLUB_ROLES as readonly string[]).includes(value);
}

/** BR124's floor: a club holds at least two administrators. */
export const ADMIN_FLOOR = 2;

/**
 * Whether this role may be taken away from this account right now.
 *
 * The refusal that matters is administrators, and the floor is **two**
 * rather than one (BR124, migration 0048). One is not a working state: a
 * club whose single administrator resigns, loses a password or goes away
 * cannot restore its own access from the inside, and it is reached by
 * ordinary tidying rather than by intent. The second administrator is what
 * makes the first removable at all.
 *
 * Enforced in the database too, on the table rather than in
 * `revoke_club_role` — this is so the button explains itself rather than
 * failing when pressed.
 */
export function revocation(
  account: ClubAccount,
  role: string,
  accounts: readonly ClubAccount[],
): { readonly allowed: true } | { readonly allowed: false; readonly reason: string } {
  if (role !== 'admin') return { allowed: true };

  const admins = accounts.filter((a) => a.roles.includes('admin'));
  if (admins.length <= 1) {
    return {
      allowed: false,
      reason:
        account.isSelf
          ? 'You are the club\u2019s only administrator. Grant admin to somebody else before removing your own.'
          : 'This is the club\u2019s only administrator. Grant admin to somebody else first.',
    };
  }
  if (admins.length <= ADMIN_FLOOR) {
    return {
      allowed: false,
      reason:
        'A club keeps two administrators (BR124). Removing this one would leave one, and a club '
        + 'with a single administrator is a resignation away from having none. Grant admin to a '
        + 'third person first.',
    };
  }
  return { allowed: true };
}

/**
 * Roles this account does not already hold, so the form offers only
 * additions.
 *
 * **`admin` is excluded for an unlinked account** (BR106, scope 48 WP3):
 * the database refuses the grant regardless — `grant_club_role` (0042)
 * checks the same `account_person` link — so offering it here would be
 * exactly the defect this file exists to avoid, an option that fails when
 * pressed. `adminNeedsLinkFirst` tells the caller *why* it is missing, so
 * the screen can still say so rather than letting the option vanish
 * unexplained.
 */
export function grantableRoles(account: ClubAccount): readonly ClubRole[] {
  const held = CLUB_ROLES.filter((r) => !account.roles.includes(r));
  return account.personId === null ? held.filter((r) => r !== 'admin') : held;
}

/**
 * Whether `admin` is missing from `grantableRoles` specifically because the
 * account is not yet linked to anybody — as opposed to already holding it,
 * which needs no explanation at all.
 */
export function adminNeedsLinkFirst(account: ClubAccount): boolean {
  return account.personId === null && !account.roles.includes('admin');
}
