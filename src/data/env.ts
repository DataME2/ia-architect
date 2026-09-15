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
  // Every Supabase client in the application is built from this, so this is
  // the one place the check cannot be routed around by a new caller.
  assertNotPreviewAgainstProduction(source);

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

/**

 * The shared secret a scheduled job's caller must present.
 *
 * Cron routes have no signed-in user, so the ordinary session check does
 * not apply — anyone who can reach the URL can trigger the job unless it
 * checks something. Vercel Cron sends this as a bearer token
 * automatically; this is the value it is compared against.
 */
export function readCronSecret(
  source: Record<string, string | undefined> = process.env,
): string {
  return required(source, 'CRON_SECRET');
}

/**
 * The project ref a preview deployment must never be pointed at.
 *
 * **Empty until the production project exists**, and inert while it is —
 * written now rather than later on purpose: the moment somebody creates the
 * production project, the dangerous window is the deploy *before* anyone
 * remembers there was a rule about this.
 *
 * A project ref is not a secret — it is in the public URL every browser
 * already sees — so it lives here rather than in an environment variable
 * a preview build could simply be missing. A guard whose enforcement can
 * be switched off by forgetting a variable is not a guard.
 *
 * **Set it to the ref alone**, the `abcdefghijklmnopqrst` out of
 * `https://abcdefghijklmnopqrst.supabase.co` — not the URL. Pasting the
 * whole URL, or a truncated ref, would leave the comparison below matching
 * nothing and the guard silently doing its job never; `validProjectRef`
 * refuses that rather than letting a typo disable a safety check. Which is
 * the same objection as the environment variable, one step along.
 */
export const PRODUCTION_PROJECT_REF = '';

/**
 * Whether a value is a project ref rather than a URL, a fragment of one, or
 * a placeholder somebody meant to come back to.
 *
 * Deliberately lenient about **length** and strict about **shape**: the two
 * realistic mistakes are pasting the whole URL and pasting half the ref,
 * and both are caught by the character class and the floor. If Supabase
 * ever issues a ref this refuses, the failure is immediate and says so —
 * which is the right way round, because the alternative failure is silent.
 */
export function validProjectRef(value: string): boolean {
  return /^[a-z0-9]{8,}$/.test(value);
}

/** `https://abc.supabase.co` → `abc`. */
function projectRefOf(supabaseUrl: string): string {
  return supabaseUrl.replace(/^https:\/\//, '').split('.')[0] ?? '';
}

/**
 * Refuses a non-production deployment pointed at the production database.
 *
 * A preview URL is effectively public — it is in the pull request, and pull
 * requests here are public — so a preview pointed at real data puts eight
 * hundred children's records behind a link anyone can open. That rule has
 * been written in
 * [`docs/ea/5_technology/2_deployment.md`](../../docs/ea/5_technology/2_deployment.md)
 * since the deployment model was drafted, and until now it was enforced by
 * somebody setting the variables correctly in a dashboard.
 *
 * **It fails closed and it fails loudly**, at configuration-read time
 * rather than on the first query, because a preview that boots and then
 * serves one request has already served it.
 *
 * `VERCEL_ENV` is `production`, `preview` or `development`, set by the
 * platform rather than by the project — a deployment cannot claim to be
 * production by editing its own variables. Absent (a developer's machine,
 * CI, a container) is treated as *not production*: pointing a local server
 * at the real club's data is the other half of the same mistake.
 */
export function assertNotPreviewAgainstProduction(
  source: Record<string, string | undefined> = process.env,
  // Injected so the tests drive *this* function rather than a copy of its
  // logic. The first version of those tests re-implemented the rule, which
  // is the divergence trap this repository has already been caught by once:
  // a copy is only ever wrong in the copy, and the copy is the one nobody
  // is watching. Nothing in the application passes it.
  productionRef: string = PRODUCTION_PROJECT_REF,
): void {
  if (productionRef === '') return;

  // **Fails closed on a malformed ref.** An unrecognisable value would
  // otherwise match no URL, so the guard would return quietly on every
  // deployment and the first anyone knew of it would be a preview serving
  // real data. A safety check that a typo turns off is worse than none,
  // because it also reports that it is on.
  if (!validProjectRef(productionRef)) {
    throw new ConfigError(
      'PRODUCTION_PROJECT_REF',
      `is set to "${productionRef}", which is not a project ref. Use the ref alone ` +
        '(the "abcdefghijklmnopqrst" out of https://abcdefghijklmnopqrst.supabase.co), ' +
        'not the URL — otherwise this guard silently matches nothing.',
    );
  }

  const supabaseUrl = source['NEXT_PUBLIC_SUPABASE_URL'];
  if (supabaseUrl === undefined || supabaseUrl.trim() === '') return;
  if (projectRefOf(supabaseUrl.trim()) !== productionRef) return;

  const environment = source['VERCEL_ENV'];
  if (environment === 'production') return;

  throw new ConfigError(
    'NEXT_PUBLIC_SUPABASE_URL',
    `points at the production project (${productionRef}) from a ` +
      `${environment ?? 'local or unidentified'} environment. A preview URL is public, and ` +
      'this database holds real children\'s records. Point it at the development project, or ' +
      'deploy to production properly.',
  );

}
