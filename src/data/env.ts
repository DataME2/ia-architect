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
 * Configuration safe to ship to a browser.
 *
 * The anon key belongs here and is not a secret: it is safe **because** every
 * table has Row-Level Security. If RLS coverage ever lapses, this key stops
 * being safe — which is why `scripts/check_rls.py` is a build gate rather
 * than a lint.
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
    supabaseAnonKey: required(source, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
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
