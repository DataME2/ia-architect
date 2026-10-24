import type { FormResult } from './form-result.ts';

/**
 * A person's own sign-in link, made for an administrator to send (BR180,
 * scope 109).
 *
 * Whoever opens it is signed in as that person, and a first sign-in claims
 * everything addressed to that email at every club. So a link is made only
 * where that is one new account arriving at this club: never for an account
 * somebody already uses, and never for an address another club is waiting
 * for, which P5 says this club's administrator must not reach.
 */
export interface AccountTies {
  readonly hasSignedIn: boolean;
  /** Any club membership, person link or platform role, at any club. */
  readonly holdsAccess: boolean;
  /** Clubs with unclaimed access addressed to this email. */
  readonly waitingClubIds: readonly string[];
}

/** Why no link may be made, or null when one may. */
export function refuseSignInLink(clubId: string, email: string, ties: AccountTies): string | null {
  if (ties.hasSignedIn || ties.holdsAccess) {
    return `${email} already has an account in use, so its sign-in link is not handed to anyone else. Resend link emails it to them.`;
  }
  if (ties.waitingClubIds.some((id) => id !== clubId)) {
    return `Another club is waiting for ${email} too, and a link would open that as well. Resend link emails it to them.`;
  }
  return null;
}

/** The link types `/welcome` will verify: a first sign-in, existing account or new. */
export const LINK_TYPES = ['magiclink', 'signup'] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export function linkType(value: unknown): LinkType | null {
  return LINK_TYPES.find((t) => t === value) ?? null;
}

/**
 * The address to send. It opens a page rather than signing in on arrival,
 * because a chat app that fetches it for a preview would otherwise use up
 * the single-use link before the person sees it.
 */
export function welcomeLink(origin: string, tokenHash: string, type: LinkType): string {
  return `${origin}/welcome?${new URLSearchParams({ token: tokenHash, type })}`;
}

/** What *Create a link to share* hands back: the usual notice, or the link. */
export type ShareLinkResult =
  | FormResult
  | { readonly status: 'link'; readonly link: string; readonly email: string };
