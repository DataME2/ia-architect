/**
 * Reading and validating configuration.
 *
 * Separated from the clients so it is pure and testable, and so there is one
 * place that knows which variables are public and which are secret.
 */

export interface PublicConfig {
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
}

export interface ServiceConfig {
  readonly supabaseServiceRoleKey: string;
}

export interface MessagingConfig {
  /**
   * The secret behind every unsubscribe link (decision 12).
   *
   * Server-scoped, like the service-role key. The token in a message is
   * `HMAC(this, the subscriber's salt)`, so the database stores nothing
   * that is a credential — and rotating this invalidates every link already
   * sitting in somebody's inbox, which is why it is rotated deliberately or
   * not at all.
   */
  readonly unsubscribeSecret: string;
  /** Absolute, because the link is read outside the app. */
  readonly siteUrl: string;
}

export interface TransportConfig {
  readonly apiKey: string;
  readonly fromAddress: string;
}

export class ConfigError extends Error {
  constructor(variable: string, detail: string) {
    super(`${variable}: ${detail}`);
    this.name = 'ConfigError';
  }
}

function required(source: Record<string, string | undefined>, name: string): string {
  const value = source[name];
  if (value === undefined || value.trim() === '') {
    throw new ConfigError(name, 'is not set — copy .env.example to .env.local and fill it in');
  }
  return value;
}

/**
 * Reads whichever of two variable names is set, preferring the first.
 *
 * Exists for exactly one pair: Supabase renamed the client-side key from
 * `anon` to `publishable` (and `service_role` to `secret`) without retiring
 * the legacy pair, so a dashboard copy-paste today can hand someone either
 * name. Refusing the newer one until docs catch up just reproduces the
 * config error this file exists to give a good message for.
 */
function requiredEither(
  source: Record<string, string | undefined>,
  primary: string,
  fallback: string,
): string {
  const value = source[primary] ?? source[fallback];
  if (value === undefined || value.trim() === '') {
    throw new ConfigError(
      `${primary} (or ${fallback})`,
      'is not set — copy .env.example to .env.local and fill it in',
    );
  }
  return value;
}

/**
 * Configuration safe to ship to a browser.
 *
 * The anon/publishable key belongs here and is not a secret: it is safe
 * **because** every table has Row-Level Security. If RLS coverage ever
 * lapses, this key stops being safe — which is why `scripts/check_rls.py`
 * is a build gate rather than a lint.
 */
export function readPublicConfig(
  source: Record<string, string | undefined> = process.env,
): PublicConfig {
  const supabaseUrl = required(source, 'NEXT_PUBLIC_SUPABASE_URL');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(supabaseUrl)) {
    throw new ConfigError(
      'NEXT_PUBLIC_SUPABASE_URL',
      `expected https://<project-ref>.supabase.co, got ${supabaseUrl}`,
    );
  }
  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    // `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the name every doc in this repo
    // uses; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is Supabase's current
    // dashboard label for the same value (project settings → API →
    // "Publishable key", the `sb_publishable_...` form). Either works.
    supabaseAnonKey: requiredEither(
      source,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
  };
}

/**
 * Configuration that must never reach a browser.
 *
 * Refuses to read a service-role key from a `NEXT_PUBLIC_` variable, because
 * that prefix is what puts a value in the client bundle — and a service-role
 * key in a bundle is every club's data, readable by anyone who opens dev
 * tools. The check is here rather than in review because the mistake is one
 * character of prefix.
 */
export function readServiceConfig(
  source: Record<string, string | undefined> = process.env,
): ServiceConfig {
  if (source['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'] !== undefined) {
    throw new ConfigError(
      'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
      'must not exist — a NEXT_PUBLIC_ prefix ships the value to every browser, ' +
        'and this key bypasses Row-Level Security for every club',
    );
  }
  return { supabaseServiceRoleKey: required(source, 'SUPABASE_SERVICE_ROLE_KEY') };
}

/**
 * Configuration for composing an unsubscribe link.
 *
 * Refuses a `NEXT_PUBLIC_` unsubscribe secret for the same reason the
 * service-role key is refused: the prefix ships it to every browser, and
 * anyone holding it can derive the unsubscribe token for any salt they can
 * read.
 */
export function readMessagingConfig(
  source: Record<string, string | undefined> = process.env,
): MessagingConfig {
  if (source['NEXT_PUBLIC_MESSAGING_UNSUBSCRIBE_SECRET'] !== undefined) {
    throw new ConfigError(
      'NEXT_PUBLIC_MESSAGING_UNSUBSCRIBE_SECRET',
      'must not exist — a NEXT_PUBLIC_ prefix ships the value to every browser, ' +
        'and this secret derives the unsubscribe token of every recipient',
    );
  }
  const siteUrl = required(source, 'NEXT_PUBLIC_SITE_URL').replace(/\/$/, '');
  return {
    unsubscribeSecret: required(source, 'MESSAGING_UNSUBSCRIBE_SECRET'),
    siteUrl,
  };
}

/**
 * The email provider's credentials, or `null` when none is configured.
 *
 * Null rather than a throw, so the send path can distinguish "not set up"
 * from "misconfigured" and say the true thing on the screen. What it must
 * never do is treat an absent provider as a successful send — silence is
 * not a success state, and a reminder nobody received is worse than a
 * reminder the registrar knows failed.
 */
export function readTransportConfig(
  source: Record<string, string | undefined> = process.env,
): TransportConfig | null {
  const apiKey = source['MESSAGING_PROVIDER_API_KEY'];
  const fromAddress = source['MESSAGING_FROM_ADDRESS'];
  if (apiKey === undefined || apiKey.trim() === '') return null;
  if (fromAddress === undefined || fromAddress.trim() === '') {
    throw new ConfigError('MESSAGING_FROM_ADDRESS', 'is required when MESSAGING_PROVIDER_API_KEY is set');
  }
  return { apiKey, fromAddress };
}

/**
 * Where an operator alert goes, or `null` when nobody is being told.
 *
 * **Configuration rather than data**, and deliberately so. The obvious
 * alternative — read the platform administrators' own addresses out of
 * `platform_admin` — would mean a public, unauthenticated code path
 * obtaining them, either through a function granted to `anon` (which then
 * discloses them to anyone who calls it) or through the service-role
 * client (which hands a full Row-Level Security bypass to the one path on
 * the site that any stranger can reach). Neither is worth a convenience.
 *
 * It is also the more accurate model: the address an enquiry should land
 * at is usually a shared inbox somebody watches, not the login address of
 * whoever happens to be on the allowlist.
 *
 * Null when unset, like `readTransportConfig`, so the caller can record
 * *nobody was told and here is why* rather than treating silence as
 * success (BR146, and BR127's reasoning one level out).
 */
export function readPlatformAlertAddress(
  source: Record<string, string | undefined> = process.env,
): string | null {
  const address = source['PLATFORM_ALERT_TO'];
  if (address === undefined || address.trim() === '') return null;
  return address.trim();
}
