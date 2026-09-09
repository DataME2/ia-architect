/**
 * Which role a Person is acting in, and what that context may show.
 *
 * **BR61 is the whole of this file.** "A Person holding several roles
 * operates in one active role context at a time. The app presents only that
 * role's information and actions, switching is explicit, and no switch ever
 * merges two roles' views or exposes data the active role would not
 * otherwise see."
 *
 * It has been documented since the business layer was drafted and never
 * once executed. Putting it here — pure, no I/O, no DOM, under the
 * `tsconfig.domain.json` guard — means every claim about what a guardian
 * may see is a unit test rather than a screen somebody eyeballed. If this
 * module is right the components are only rendering; if it is wrong, no
 * amount of correct rendering saves it.
 *
 * The active context is **derived, never stored**. It is a lens over
 * `club_membership` and `person_role`, not a new fact about a Person, and
 * persisting it would create a second source of truth for something those
 * tables already answer.
 */

/** The five lenses a Person can operate the product through. */
export type RoleKey = 'player' | 'coach' | 'referee' | 'guardian' | 'committee';

/**
 * Presentation order, fixed. The rail must not reorder itself between
 * renders — a switcher whose items move is a switcher people mis-click.
 */
export const ROLE_ORDER: readonly RoleKey[] = [
  'player',
  'coach',
  'referee',
  'guardian',
  'committee',
];

export const ROLE_LABEL: Readonly<Record<RoleKey, string>> = {
  player: 'Player',
  coach: 'Coach',
  referee: 'Referee',
  guardian: 'Guardian',
  committee: 'Committee',
};

/** One role a Person holds, at one club, as the data layer supplies it. */
export interface RoleHolding {
  readonly key: RoleKey;
  readonly clubId: string;
  readonly clubName: string;
  /** "U12 Girls", "for Tané", "Secretary" — what narrows the role. */
  readonly scope: string | null;
  /** Items this role is waiting on. See `COUNTS_CROSS_BOUNDARY`. */
  readonly pending: number;
}

/** A resolved context: exactly one holding, plus how it was arrived at. */
export interface ActiveContext {
  readonly holding: RoleHolding;
  /**
   * `sole` — the Person holds one role, so nothing was switched.
   * `chosen` — the Person explicitly selected this one.
   *
   * The distinction is BR61's, not cosmetic: a context that was *chosen*
   * can be reported back to the user as a choice they made, and a context
   * that is merely `sole` must never be described as one.
   */
  readonly how: 'sole' | 'chosen';
}

/**
 * Whether a role chip may show a count for a role that is **not** the active
 * one.
 *
 * This is the single switch behind [open question 67](../../docs/scope/open-questions.md).
 * The adopted reading is that a count of *your own* pending items, in a role
 * *you hold*, is not another role's data — and that without it the switcher
 * is useless, because nobody switches into five contexts on the chance one
 * of them wants something. The counter-argument is real: a guardian's screen
 * reporting that the committee context has three items is still the
 * committee telling the guardian something.
 *
 * It is one constant and one branch on purpose. If the answer comes back
 * *no*, this flips to `false` and the design degrades to a dot with no
 * number — it does not need a redesign.
 */
export const COUNTS_CROSS_BOUNDARY = true;

/**
 * The holdings a Person may switch between, in a stable order.
 *
 * Duplicates are collapsed on `key + clubId`, because holding the coach role
 * at one club through two different teams is one lens, not two — and a
 * switcher that lists "Coach" twice is a switcher that has stopped
 * explaining anything.
 */
export function buildContexts(holdings: readonly RoleHolding[]): readonly RoleHolding[] {
  const seen = new Map<string, RoleHolding>();
  for (const h of holdings) {
    const id = `${h.key}:${h.clubId}`;
    const existing = seen.get(id);
    if (existing === undefined) {
      seen.set(id, h);
    } else {
      // Two holdings of the same role at the same club: keep one lens, and
      // carry the total of what both are waiting on.
      seen.set(id, { ...existing, pending: existing.pending + h.pending });
    }
  }
  const all = [...seen.values()];
  return ROLE_ORDER.flatMap((key) => all.filter((h) => h.key === key));
}

/**
 * Resolve which context is active — BR61's "switching is explicit", stated
 * as a function that refuses to guess.
 *
 * With several roles held and no explicit request, the answer is `null`,
 * meaning **ask**. It deliberately does not fall back to the first role, to
 * the most recently used one, or to the one with the most pending items:
 * each of those is a switch the Person did not make, and BR61 forbids
 * exactly that. A single holding is not a switch at all, so it resolves.
 */
export function resolveActive(
  contexts: readonly RoleHolding[],
  requested: { readonly key?: string | null; readonly clubId?: string | null } = {},
): ActiveContext | null {
  if (contexts.length === 0) return null;

  const key = requested.key ?? null;
  const clubId = requested.clubId ?? null;

  if (key !== null) {
    const matches = contexts.filter((c) => c.key === key);
    // A club must be named only where the same role is held at more than
    // one club; otherwise naming the role is already unambiguous.
    const chosen =
      clubId !== null
        ? matches.find((c) => c.clubId === clubId)
        : matches.length === 1
          ? matches[0]
          : undefined;
    return chosen === undefined ? null : { holding: chosen, how: 'chosen' };
  }

  return contexts.length === 1 ? { holding: contexts[0]!, how: 'sole' } : null;
}

/** What a role chip is allowed to render for a context that is not active. */
export function chipCount(
  holding: RoleHolding,
  active: ActiveContext | null,
): number | null {
  const isActive =
    active !== null &&
    active.holding.key === holding.key &&
    active.holding.clubId === holding.clubId;
  if (isActive) return holding.pending;
  return COUNTS_CROSS_BOUNDARY ? holding.pending : null;
}

/* ────────────────────────────── BR6 and BR109 ────────────────────────── */

/** A role the same Person already holds in a given fixture. */
export type FixtureClaim = 'player' | 'coach' | 'team-official' | 'guardian-of-player';

export interface FixtureRoleClaim {
  readonly fixtureId: string;
  readonly personId: string;
  readonly claim: FixtureClaim;
}

export interface AppointmentConflict {
  readonly claim: FixtureClaim;
  /** The rule that refuses it, for the interface to name. */
  readonly ruleId: 'BR6' | 'BR109';
  readonly message: string;
}

const CONFLICT_MESSAGE: Readonly<Record<FixtureClaim, string>> = {
  player: 'You are registered as a player in this match.',
  coach: 'You coach a side in this match.',
  'team-official': 'You are a team official for a side in this match.',
  'guardian-of-player': 'You are the guardian of a player in this match.',
};

/**
 * Whether a match official appointment collides with another role the same
 * Person holds in that fixture.
 *
 * **BR6** refuses the referee who is a *Player* in the match — the conflict
 * nobody would attempt. **BR109** refuses the other three, which are the
 * ones grassroots produces every weekend: the parent who referees the junior
 * grades and coaches a side in them, or whose child is on the field.
 *
 * Both are answerable only because of P1. Two accounts could not know that
 * the referee and the coach are one human, so the conflict would be
 * invisible to the system and left to a volunteer to notice at 7am on a
 * Sunday. The claims are passed in **across every club** deliberately: the
 * guardian case routinely spans two, and a check confined to one tenant
 * would miss it.
 */
export function appointmentConflict(
  personId: string,
  fixtureId: string,
  claims: readonly FixtureRoleClaim[],
): AppointmentConflict | null {
  // Ordered so the most direct conflict is the one reported, rather than
  // whichever happened to be first in the array.
  const order: readonly FixtureClaim[] = ['player', 'coach', 'team-official', 'guardian-of-player'];
  const held = new Set(
    claims
      .filter((c) => c.personId === personId && c.fixtureId === fixtureId)
      .map((c) => c.claim),
  );
  for (const claim of order) {
    if (held.has(claim)) {
      return {
        claim,
        ruleId: claim === 'player' ? 'BR6' : 'BR109',
        message: CONFLICT_MESSAGE[claim],
      };
    }
  }
  return null;
}

/**
 * The appointments that may be offered at all.
 *
 * BR109 says **never offered**, following BR83's shape, rather than offered
 * and refused — a refusal a person can see invites them to ask for an
 * exception, and the appointing coordinator is who should be resolving that,
 * not the official staring at a greyed-out button.
 */
export function offerableAppointments<T extends { readonly fixtureId: string }>(
  personId: string,
  appointments: readonly T[],
  claims: readonly FixtureRoleClaim[],
): readonly T[] {
  return appointments.filter((a) => appointmentConflict(personId, a.fixtureId, claims) === null);
}
