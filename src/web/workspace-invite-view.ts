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

export function planWorkspaceInvites(input: InviteInput): InvitePlan {
  if (!input.isPlayerThisSeason || !input.registrationComplete) return NOTHING;

  const send: Recipient[] = [];
  const missingEmail: { kind: Recipient['kind']; name: string }[] = [];
  const consider = (kind: Recipient['kind'], c: InviteCandidate) => {
    if (c.alreadyInvited) return;
    const email = (c.email ?? '').trim();
    if (email === '') missingEmail.push({ kind, name: c.name });
    else send.push({ kind, personId: c.personId, email });
  };

  const minor = input.age < 18;
  if (minor) input.authorityGuardians.forEach((g) => consider('guardian', g));
  if (input.age >= 13) consider('player', input.player);

  return { send, missingEmail, noGuardian: minor && input.authorityGuardians.length === 0 };
}
