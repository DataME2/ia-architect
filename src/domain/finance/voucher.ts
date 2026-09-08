/**
 * Government youth-sport vouchers, attached and verified by hand.
 *
 * Most MiniRoos families arrive with one — Queensland's Play On! is the
 * pilot club's approved program (BR21) — so this is the common case, not an
 * edge one.
 *
 * **The load-bearing rule is BR81: attaching a voucher changes nothing.** A
 * PDF in the system is a *claim* that a discount applies, not the discount
 * itself. Only a club officer confirming the code is genuine reduces what
 * the family owes, and until that happens the balance stands, BR3 keeps
 * failing, and BR79 keeps the player off the field. That is deliberate: a
 * voucher that turns out to be expired, already spent, or mistyped would
 * otherwise have let a child play on money the club never receives, and the
 * club discovers it when the government refuses the claim months later.
 *
 * Relief is applied as an ordinary **payment of method `voucher`**, not as a
 * separate discount column. One ledger, so the balance, the receipts, BR3
 * and BR79 all agree without anything reconciling them — and a voucher later
 * found invalid is reversed the same way any other receipt is (BR77).
 */
import { formatMoney } from './money.ts';

/**
 * `ATTACHED` is the state that matters: the file is here, nobody has checked
 * it, and nothing has changed for the family. `CLAIMED` follows BR23/BR24 —
 * the club has asked the government for the money back — and is tracked
 * separately because reimbursement is the club's problem, never the
 * family's.
 */
export const VOUCHER_STATES = ['ATTACHED', 'VERIFIED', 'REJECTED', 'CLAIMED'] as const;
export type VoucherState = (typeof VOUCHER_STATES)[number];

export interface Voucher {
  readonly id: string;
  readonly registrationId: string;
  /** e.g. 'Play On!' — configuration, never code (BR21). */
  readonly program: string;
  readonly code: string;
  /** What the family says it is worth. Not applied until verified. */
  readonly faceValueCents: number;
  readonly state: VoucherState;
  /** Path in Storage. `null` where a code was recorded without the document. */
  readonly filePath: string | null;
  readonly attachedAt: string;
  readonly verifiedAt: string | null;
  readonly rejectionReason: string | null;
  /** The receipt carrying this voucher's relief, or `null` if none applies. */
  readonly reliefPaymentId: string | null;
}

/** A verified voucher is money the club will get; an attached one is not. */
export function isRelieving(voucher: Voucher): boolean {
  return voucher.state === 'VERIFIED' || voucher.state === 'CLAIMED';
}

/** What has actually been taken off the family's balance. */
export function reliefCents(vouchers: readonly Voucher[]): number {
  return vouchers.filter(isRelieving).reduce((sum, v) => sum + v.faceValueCents, 0);
}

/**
 * Vouchers sitting on a registrar's desk.
 *
 * The queue this exists to make visible: attached, unchecked, and holding a
 * child out of the season while nobody has looked at it.
 */
export function awaitingVerification(vouchers: readonly Voucher[]): readonly Voucher[] {
  return vouchers.filter((v) => v.state === 'ATTACHED');
}

/**
 * What to tell a registrar looking at one registration, or `null` when
 * there are no vouchers at all.
 */
export function voucherSummary(vouchers: readonly Voucher[]): string | null {
  if (vouchers.length === 0) return null;

  const waiting = awaitingVerification(vouchers);
  if (waiting.length > 0) {
    const value = waiting.reduce((sum, v) => sum + v.faceValueCents, 0);
    return `${waiting.length === 1 ? 'A voucher' : `${waiting.length} vouchers`} worth ${formatMoney(value)} ${waiting.length === 1 ? 'is' : 'are'} attached and not yet verified. Nothing has come off the balance, so the player stays pending (BR81).`;
  }

  const relieved = reliefCents(vouchers);
  if (relieved > 0) return `${formatMoney(relieved)} of verified voucher relief applied.`;

  return 'Every voucher attached to this registration was rejected.';
}

export type VerifyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: string };

/**
 * Whether a voucher may move to `VERIFIED`.
 *
 * Verifying twice would apply the relief twice — two payments of method
 * `voucher` for one discount — so the state is the guard rather than the
 * button being hidden.
 */
export function canVerify(voucher: Voucher): VerifyResult {
  if (voucher.state === 'VERIFIED' || voucher.state === 'CLAIMED') {
    return { ok: false, error: 'This voucher is already verified.' };
  }
  if (voucher.faceValueCents <= 0) {
    return { ok: false, error: 'A voucher must be worth something to verify.' };
  }
  return { ok: true };
}
