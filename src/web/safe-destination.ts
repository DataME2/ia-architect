/**
 * Where a sign-in is allowed to send someone afterwards.
 *
 * An allowlist rather than a shape check. The obvious guard — "does it start
 * with a slash?" — lets `//evil.example` through, because that is a
 * protocol-relative URL the browser reads as a different host: an open
 * redirect on the one page whose whole job is handling credentials.
 *
 * Naming the destinations also satisfies Next's typed routes, so a route
 * that stops existing becomes a compile error rather than a 404 after
 * someone signs in.
 */

export const SAFE_DESTINATIONS = [
  '/registrar',
  '/register',
  '/set-password',
  '/platform',
] as const;

export type SafeDestination = (typeof SAFE_DESTINATIONS)[number];

export const DEFAULT_DESTINATION: SafeDestination = '/registrar';

/** The requested destination if it is one we publish, otherwise the default. */
export function safeDestination(value: string | undefined | null): SafeDestination {
  if (typeof value !== 'string') return DEFAULT_DESTINATION;
  const match = SAFE_DESTINATIONS.find((route) => route === value);
  return match ?? DEFAULT_DESTINATION;
}

/**
 * Where signing in should land somebody who asked for nowhere in particular.
 *
 * The platform identity holds **no club membership** — that is what keeps
 * every ordinary policy denying it ([decision 9]) — so the club queue has
 * nothing to show it and answers, correctly, that this account belongs to no
 * club. Correct and useless: the operator reads it as a fault, on the one
 * account that cannot ever have a club.
 *
 * A requested destination still wins. Somebody following a link to
 * `/set-password` needs to arrive at `/set-password` whoever they are, and
 * an operator who asks for the queue is entitled to see the same empty
 * answer anybody else would.
 */
export function landingFor(
  requested: string | undefined | null,
  isPlatform: boolean,
): SafeDestination {
  if (typeof requested === 'string' && SAFE_DESTINATIONS.includes(requested as SafeDestination)) {
    return requested as SafeDestination;
  }
  return isPlatform ? '/platform' : DEFAULT_DESTINATION;
}
