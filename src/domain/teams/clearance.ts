/**
 * BR19 and BR54 — no card, no start, measured against the end of the season.
 *
 * Queensland's Blue Card rule is literally "no card, no start": a person in
 * a child-related role may not begin until their check is verified. This is
 * the one place in the project where the rule is not about tidiness or
 * money, and it is the reason the check is *also* a database trigger — a
 * screen that forgets leaves a child standing in front of an uncleared
 * adult.
 *
 * **BR54 is the part that is easy to get wrong.** The question is not "is
 * this card valid today" but "does it cover the season this team plays".
 * A coach whose card expires in round 12 has not passed; they have failed
 * later, and finding out in round 12 means finding out with a fixture on
 * Saturday and no replacement. Asked at the point of appointment, the club
 * has months.
 */
import type { IsoDate } from '../types.ts';
import type { Clearance, TeamRole } from './types.ts';
import { isOfficialRole } from './types.ts';

export type ClearanceVerdict =
  | { readonly ok: true; readonly expiresOn: IsoDate | null; readonly note: string }
  | { readonly ok: false; readonly reason: ClearanceProblem; readonly note: string };

export type ClearanceProblem = 'none-held' | 'unverified' | 'revoked' | 'expires-in-season';

/** Live means not revoked and actually checked by a human against the portal. */
export function isUsable(clearance: Clearance): boolean {
  return clearance.revokedAt === null && clearance.verifiedAt !== null;
}

/**
 * The clearance that covers furthest into the future, or `null`.
 *
 * A person may hold more than one — a renewal recorded before the old one
 * lapses, or a card from another state — and the best of them is what
 * decides. Taking the most recently created one instead would fail a coach
 * whose new card was entered before the old one expired.
 */
export function bestClearance(clearances: readonly Clearance[]): Clearance | null {
  const usable = clearances.filter(isUsable);
  if (usable.length === 0) return null;
  return usable.reduce((best, c) => (c.expiresOn > best.expiresOn ? c : best));
}

/**
 * May this person hold this role in a season ending on `seasonEndsOn`?
 *
 * Players are not asked: BR19 is about adults in child-related roles, and a
 * ten-year-old does not hold a Blue Card.
 */
export function mayHoldRole(
  role: TeamRole,
  clearances: readonly Clearance[],
  seasonEndsOn: IsoDate,
): ClearanceVerdict {
  if (!isOfficialRole(role)) {
    return { ok: true, expiresOn: null, note: 'Players do not need a clearance.' };
  }

  const held = clearances.filter((c) => c.revokedAt === null);
  if (held.length === 0 && clearances.length > 0) {
    return {
      ok: false,
      reason: 'revoked',
      note: 'Their clearance has been revoked. Under BR50 that removes them from every future assignment, not just this one.',
    };
  }
  if (clearances.length === 0) {
    return {
      ok: false,
      reason: 'none-held',
      note: 'No Working with Children Check is recorded. No card, no start (BR19).',
    };
  }

  const best = bestClearance(clearances);
  if (best === null) {
    return {
      ok: false,
      reason: 'unverified',
      note: 'A card number is recorded but nobody has checked it against the state portal. Holding a number is not verification (BR19).',
    };
  }

  if (best.expiresOn < seasonEndsOn) {
    return {
      ok: false,
      reason: 'expires-in-season',
      note: `Their clearance expires ${best.expiresOn}, before the season ends ${seasonEndsOn}. Flagged now rather than on the day it lapses (BR54).`,
    };
  }

  return {
    ok: true,
    expiresOn: best.expiresOn,
    note: `Cleared to ${best.expiresOn}, which covers the season.`,
  };
}

/**
 * Officials whose clearance runs out before the season does.
 *
 * The list a coordinator should be chasing in February rather than June.
 * BR50's automatic withdrawal is not built — see the scope document — so
 * until it is, this is the club's only warning.
 */
export function expiringBeforeSeasonEnd(
  people: readonly { readonly personId: string; readonly clearances: readonly Clearance[] }[],
  seasonEndsOn: IsoDate,
): readonly { readonly personId: string; readonly expiresOn: IsoDate }[] {
  const at_risk: { personId: string; expiresOn: IsoDate }[] = [];
  for (const person of people) {
    const best = bestClearance(person.clearances);
    if (best !== null && best.expiresOn < seasonEndsOn) {
      at_risk.push({ personId: person.personId, expiresOn: best.expiresOn });
    }
  }
  return at_risk.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
}
