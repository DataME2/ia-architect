/**
 * Who is sent a workspace link for a player, and when (scope 68 WP2).
 *
 * The club's rule (September 2026): once a Person **takes part this season
 * as a player and their registration is COMPLETE**, the links go out with
 * no admin click —
 *   - under 13: the guardian(s) holding authority (BR63 — no own account),
 *   - 13 to 17: those guardians *and* the player's own workspace,
 *   - 18 and over: the player only.
 * COMPLETE stays the gate BR126 and BR150 already enforce in the database;
 * what goes is the wait for somebody to press Invite.
 *
 * Scope 73 (BR150 extended): a **match official of thirteen or over** with a
 * referee role this season is invited to their own workspace too, with no
 * registration needed. Their guardians are not: BR126 still asks for a
 * COMPLETE registration before a family workspace.
 */

export interface InviteCandidate {
  readonly personId: string;
  readonly name: string;
  readonly email: string | null;
  readonly alreadyInvited: boolean;
}

export interface InviteInput {
  readonly age: number;
  readonly isPlayerThisSeason: boolean;
  readonly registrationComplete: boolean;
  /** Holds a referee role this season (scope 73): an own workspace from 13. */
  readonly isRefereeThisSeason?: boolean;
  readonly player: InviteCandidate;
  /** Guardians holding authority for this player (`guardianship.is_authority`). */
  readonly authorityGuardians: readonly InviteCandidate[];
}

export interface Recipient {
  readonly kind: 'player' | 'guardian';
  readonly personId: string;
  readonly email: string;
}

export interface InvitePlan {
  readonly send: readonly Recipient[];
  /** People who should get a link and cannot: no email on their record. */
  readonly missingEmail: readonly { readonly kind: Recipient['kind']; readonly name: string }[];
  /** A minor with nobody holding authority — nobody can be invited for them. */
  readonly noGuardian: boolean;
}

const NOTHING: InvitePlan = { send: [], missingEmail: [], noGuardian: false };

/** Somebody who should have a workspace for this player, and where it stands. */
export interface WorkspaceHolder {
  readonly personId: string;
  readonly name: string;
  readonly email: string | null;
  readonly invited: boolean;
  /** Claimed, and the login that claimed it is still linked to this Person. */
  readonly claimed: boolean;
  /** Claimed once, but that login is no longer linked here — locked out until reissued. */
  readonly linkLost: boolean;
}

export type WorkspaceState =
  | 'unlinked'         // claimed once, link since removed — needs a new link
  | 'active'           // they have signed in
  | 'link-sent'        // invited, not yet arrived
  | 'waiting-complete' // registration not COMPLETE yet — nothing is sent before
  | 'no-email'         // should be invited, nothing to send it to
  | 'not-sent';        // due, but marked before links went out on their own

export const WORKSPACE_STATE_LABEL: Readonly<Record<WorkspaceState, string>> = {
  unlinked: 'link removed — send a new one',
  active: 'active',
  'link-sent': 'link sent, not opened yet',
  'waiting-complete': 'waiting — registration not COMPLETE',
  'no-email': 'no email on record',
  'not-sent': 'not sent — use “Send all missing” on People',
};

/** A word or two for a chip, where the full label does not fit. */
export const WORKSPACE_STATE_SHORT: Readonly<Record<WorkspaceState, string>> = {
  unlinked: 'link removed',
  active: 'active',
  'link-sent': 'link sent',
  'waiting-complete': 'waiting',
  'no-email': 'no email',
  'not-sent': 'not sent',
};

/** The pill class each state wears: what needs a human is not the same colour as what is fine. */
export const WORKSPACE_STATE_TONE: Readonly<Record<WorkspaceState, string>> = {
  unlinked: 'pill pill-stop',
  active: 'pill pill-ok',
  'link-sent': 'pill',
  'waiting-complete': 'pill',
  'no-email': 'pill pill-stop',
  'not-sent': 'pill pill-warn',
};

export interface WorkspaceRow {
  readonly kind: 'player' | 'guardian';
  readonly personId: string;
  readonly name: string;
  readonly email: string | null;
  readonly state: WorkspaceState;
}

/**
 * Every workspace this player's season calls for, and its state — the
 * Access screen's read-only view of what `planWorkspaceInvites` sends.
 * The same ages decide who is listed, so the two cannot disagree.
 */
export function workspaceRows(input: {
  readonly age: number;
  readonly registrationComplete: boolean;
  /** A player this season; false for an official who only referees (scope 73). */
  readonly isPlayer?: boolean;
  /** A referee this season: their own row needs no registration (scope 73). */
  readonly isReferee?: boolean;
  readonly player: WorkspaceHolder;
  readonly authorityGuardians: readonly WorkspaceHolder[];
}): readonly WorkspaceRow[] {
  const isPlayer = input.isPlayer ?? true;
  const row = (kind: WorkspaceRow['kind'], h: WorkspaceHolder, ready: boolean): WorkspaceRow => ({
    kind,
    personId: h.personId,
    name: h.name,
    email: h.email,
    state: h.linkLost
      ? 'unlinked'
      : h.claimed
      ? 'active'
      : h.invited
        ? 'link-sent'
        : !ready
          ? 'waiting-complete'
          : (h.email ?? '').trim() === ''
            ? 'no-email'
            : 'not-sent',
  });

  return [
    ...(isPlayer && input.age < 18
      ? input.authorityGuardians.map((g) => row('guardian', g, input.registrationComplete))
      : []),
    ...(input.age >= 13
      ? [row('player', input.player, input.registrationComplete || input.isReferee === true)]
      : []),
  ];
}

export function planWorkspaceInvites(input: InviteInput): InvitePlan {
  const asPlayer = input.isPlayerThisSeason && input.registrationComplete;
  const asReferee = input.isRefereeThisSeason === true && input.age >= 13;
  if (!asPlayer && !asReferee) return NOTHING;

  const send: Recipient[] = [];
  const missingEmail: { kind: Recipient['kind']; name: string }[] = [];
  const consider = (kind: Recipient['kind'], c: InviteCandidate) => {
    if (c.alreadyInvited) return;
    const email = (c.email ?? '').trim();
    if (email === '') missingEmail.push({ kind, name: c.name });
    else send.push({ kind, personId: c.personId, email });
  };

  // Guardians only for a player: BR126 (scope 73 leaves it there).
  const minor = asPlayer && input.age < 18;
  if (minor) input.authorityGuardians.forEach((g) => consider('guardian', g));
  if (input.age >= 13) consider('player', input.player);

  return { send, missingEmail, noGuardian: minor && input.authorityGuardians.length === 0 };
}
