/**
 * Registration invitation links (BR72, BR73), as logic rather than markup.
 *
 * Pure. Hashing, status, and link construction — no client, no clock of its
 * own.
 */
import { createHash } from 'node:crypto';

/**
 * The value stored in `registration_invitation.token_hash`.
 *
 * **Must agree byte for byte with Postgres's
 * `encode(digest(token, 'sha256'), 'hex')`**, because the token is hashed
 * here when issued and hashed there when redeemed. A disagreement would not
 * fail loudly — it would make every link silently invalid, which is why the
 * hash of a known string is pinned in both test suites rather than trusted.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * What issuing a link hands back to the screen.
 *
 * Here rather than beside the action because a `'use server'` module may
 * only export async functions — and because `link` is the one value in the
 * system that exists exactly once (BR73).
 */
export interface IssueState {
  /** The full link, shown once and reproducible from nothing afterwards. */
  readonly link: string | null;
  readonly label: string | null;
  readonly error: string | null;
}

export const EMPTY_ISSUE_STATE: IssueState = { link: null, label: null, error: null };

export type InvitationStatus = 'live' | 'revoked' | 'expired';

/**
 * Whether a link still works, and why not if it doesn't.
 *
 * Revocation is checked before expiry: a link that was revoked *and* has
 * since expired was revoked, and telling a registrar it merely lapsed would
 * misdescribe a deliberate act.
 */
export function invitationStatus(
  invitation: { readonly expiresAt: string; readonly revokedAt: string | null },
  now: Date = new Date(),
): InvitationStatus {
  if (invitation.revokedAt !== null) return 'revoked';
  return new Date(invitation.expiresAt).getTime() <= now.getTime() ? 'expired' : 'live';
}

export const INVITATION_STATUS_LABEL: Record<InvitationStatus, string> = {
  live: 'Live',
  revoked: 'Revoked',
  expired: 'Expired',
};

/**
 * The link a family follows.
 *
 * Built from the request's own origin rather than a configured base URL, so
 * a preview deployment hands out preview links instead of quietly sending
 * families to production.
 */
export function invitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/join/${encodeURIComponent(token)}`;
}

/** How long a new link lasts unless the club says otherwise. */
export const DEFAULT_EXPIRY_DAYS = 60;

/**
 * Clamp a requested lifetime to something defensible.
 *
 * An unbounded link is the failure mode BR73 is about — a registration URL
 * outlives its season in a WhatsApp group, and every extra month is time in
 * which a leaked link still writes into the club.
 */
export function clampExpiryDays(requested: number): number {
  if (!Number.isFinite(requested)) return DEFAULT_EXPIRY_DAYS;
  return Math.min(Math.max(Math.trunc(requested), 1), 365);
}

export function expiryFrom(now: Date, days: number): string {
  const expires = new Date(now.getTime());
  expires.setUTCDate(expires.getUTCDate() + clampExpiryDays(days));
  return expires.toISOString();
}
