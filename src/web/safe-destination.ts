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

export const SAFE_DESTINATIONS = ['/registrar', '/register'] as const;

export type SafeDestination = (typeof SAFE_DESTINATIONS)[number];

export const DEFAULT_DESTINATION: SafeDestination = '/registrar';

/** The requested destination if it is one we publish, otherwise the default. */
export function safeDestination(value: string | undefined | null): SafeDestination {
  if (typeof value !== 'string') return DEFAULT_DESTINATION;
  const match = SAFE_DESTINATIONS.find((route) => route === value);
  return match ?? DEFAULT_DESTINATION;
}
