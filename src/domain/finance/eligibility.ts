/**
 * BR79 — no pay, no play.
 *
 * The club's policy is absolute: a Player with anything outstanding does not
 * take the field, whether or not a payment plan has been agreed. A plan
 * schedules the debt; it does not buy a game.
 *
 * **This has to be its own question, asked separately from the registration
 * rules, and the reason is a gap none of them can close.** BR3 blocks a
 * registration from completing while money is owed, and that handles the
 * ordinary case — a family who has not paid never reaches the federation.
 * But it only works in one direction. Once a registration is COMPLETE the
 * status is deliberately frozen: `statusFromValidation` refuses to move it
 * back, because a club's own screen must never revoke an eligibility the
 * federation conferred (BR60).
 *
 * So consider a player registered and confirmed in round 1, who is charged
 * a mid-season fee in round 5 — or whose payment is reversed because the
 * cash was never banked (BR77). BR3 now fails. The status stays COMPLETE.
 * Every screen that asks "is this registration finished?" says yes, and the
 * child takes the field owing money, which is the exact thing the policy
 * exists to prevent.
 *
 * Eligibility is therefore evaluated fresh, from the status *and* the
 * balance, every time it is asked — never stored, never derived once.
 */
import type { RegistrationStatus } from '../types.ts';
import { isEligibleToPlay } from '../submission/status.ts';
import { formatMoney } from './money.ts';

export type PlayBlock = 'not-registered' | 'owes-money';

export interface PlayEligibility {
  readonly mayPlay: boolean;
  /** Why not, or `null` when they may play. */
  readonly blockedBy: PlayBlock | null;
  /** One line for a registrar, a treasurer, or a coach with a team sheet. */
  readonly reason: string;
}

/**
 * Whether a Player may take the field.
 *
 * Two independent gates, and **both** must pass:
 *
 *   BR43/BR60  the federation has confirmed them. The club cannot confer
 *              this and must never appear to.
 *   BR79       the club is owed nothing. The club *can* confer this, and
 *              this is the half it controls.
 *
 * Registration is reported first when both fail, because it is the one the
 * club cannot fix by taking a payment over the phone.
 */
export function playEligibility(
  status: RegistrationStatus,
  outstandingCents: number,
): PlayEligibility {
  if (!isEligibleToPlay(status)) {
    return {
      mayPlay: false,
      blockedBy: 'not-registered',
      reason:
        outstandingCents > 0
          ? `Not registered with the federation, and ${formatMoney(outstandingCents)} is outstanding.`
          : 'Not yet confirmed present in the federation’s system (BR43).',
    };
  }

  if (outstandingCents > 0) {
    return {
      mayPlay: false,
      blockedBy: 'owes-money',
      reason: `Registered, but ${formatMoney(outstandingCents)} is outstanding — no pay, no play (BR79).`,
    };
  }

  return { mayPlay: true, blockedBy: null, reason: 'Registered and paid up.' };
}

/**
 * The players who are registered and still cannot play, because of money.
 *
 * Deliberately narrower than "everyone who owes something". A registration
 * still working its way through the queue is already visible as work in
 * progress; this is the pile that *looks* finished on every other screen and
 * is not — the one a coach would otherwise pick from.
 */
export function blockedByMoney<T extends { readonly status: RegistrationStatus; readonly outstandingCents: number }>(
  entries: readonly T[],
): readonly T[] {
  return entries.filter(
    (e) => playEligibility(e.status, e.outstandingCents).blockedBy === 'owes-money',
  );
}

/** What the club is owed across a set of registrations, ignoring credits. */
export function totalOwed(
  entries: readonly { readonly outstandingCents: number }[],
): number {
  return entries.reduce((sum, e) => sum + Math.max(0, e.outstandingCents), 0);
}
