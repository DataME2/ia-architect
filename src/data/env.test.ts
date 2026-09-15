import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertNotPreviewAgainstProduction,
  ConfigError,
  readCronSecret,
  readPublicConfig,
  readServiceConfig,
} from './env.ts';

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-ref.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-placeholder',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key-placeholder',
};

describe('public config', () => {
  it('reads a valid project URL and anon key', () => {
    const config = readPublicConfig(VALID);
    assert.equal(config.supabaseUrl, 'https://your-project-ref.supabase.co');
    assert.equal(config.supabaseAnonKey, 'anon-key-placeholder');
  });

  it('strips a trailing slash so URLs concatenate predictably', () => {
    const config = readPublicConfig({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-ref.supabase.co/',
    });
    assert.equal(config.supabaseUrl, 'https://your-project-ref.supabase.co');
  });

  it('rejects a missing variable with an actionable message', () => {
    assert.throws(
      () => readPublicConfig({ ...VALID, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }),
      (error: Error) => error instanceof ConfigError && /\.env\.local/.test(error.message),
    );
  });

  it('rejects a plain-http or malformed URL', () => {
    for (const url of ['http://x.supabase.co', 'https://example.test', 'not-a-url']) {
      assert.throws(
        () => readPublicConfig({ ...VALID, NEXT_PUBLIC_SUPABASE_URL: url }),
        ConfigError,
        `expected ${url} to be rejected`,
      );
    }
  });

  it('falls back to the publishable-key name Supabase\'s dashboard shows today', () => {
    const config = readPublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: VALID.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_placeholder',
    });
    assert.equal(config.supabaseAnonKey, 'sb_publishable_placeholder');
  });

  it('prefers the anon-key name when both are set, rather than picking arbitrarily', () => {
    const config = readPublicConfig({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_placeholder',
    });
    assert.equal(config.supabaseAnonKey, 'anon-key-placeholder');
  });

  it('names both variables when neither is set', () => {
    assert.throws(
      () =>
        readPublicConfig({
          NEXT_PUBLIC_SUPABASE_URL: VALID.NEXT_PUBLIC_SUPABASE_URL,
        }),
      (error: Error) =>
        error instanceof ConfigError &&
        /NEXT_PUBLIC_SUPABASE_ANON_KEY \(or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\)/.test(
          error.message,
        ),
    );
  });
});

describe('service config', () => {
  it('reads the service-role key from a non-public variable', () => {
    assert.equal(readServiceConfig(VALID).supabaseServiceRoleKey, 'service-key-placeholder');
  });

  it('refuses a service-role key behind a NEXT_PUBLIC_ prefix', () => {
    assert.throws(
      () =>
        readServiceConfig({
          ...VALID,
          NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'leaked-to-every-browser',
        }),
      (error: Error) =>
        error instanceof ConfigError && /bypasses Row-Level Security/.test(error.message),
    );
  });

  it('fails loudly when the key is absent rather than falling back', () => {
    assert.throws(
      () => readServiceConfig({ ...VALID, SUPABASE_SERVICE_ROLE_KEY: undefined }),
      ConfigError,
    );
  });
});

describe('cron secret', () => {
  it('reads the shared secret a scheduled job checks its caller against', () => {
    assert.equal(readCronSecret({ CRON_SECRET: 'a-long-random-value' }), 'a-long-random-value');
  });

  it('fails loudly when unset rather than letting every caller through', () => {
    assert.throws(() => readCronSecret({}), ConfigError);
  });
});

describe('a preview must never reach production (D10, task 0.4)', () => {
  // The shipped constant is empty until the production project exists, so
  // these pass a ref of their own rather than waiting for it: the guard has
  // to be known-good *before* the day it starts mattering, which is the day
  // somebody creates that project.
  // A real ref's shape — twenty lowercase characters — not a short label.
  // The first version used 'prodref', which the malformed-ref check below
  // correctly refuses; a fixture that could not be a real value is a test
  // that does not exercise the real path.
  const PROD = 'prodrefabcdefghijklm';
  const url = (ref: string) => ({ NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co` });

  const check = (env: Record<string, string | undefined>, productionRef = PROD) =>
    assertNotPreviewAgainstProduction(env, productionRef);

  it('refuses a preview deployment pointed at production', () => {
    assert.throws(() => check({ ...url(PROD), VERCEL_ENV: 'preview' }), ConfigError);
  });

  it('refuses a local or unidentified environment pointed at production', () => {
    // Pointing a developer's machine at the real club's data is the other
    // half of the same mistake, so an absent VERCEL_ENV is not a pass.
    assert.throws(() => check({ ...url(PROD) }), ConfigError);
    assert.throws(() => check({ ...url(PROD), VERCEL_ENV: 'development' }), ConfigError);
  });

  it('allows the production deployment itself', () => {
    assert.doesNotThrow(() => check({ ...url(PROD), VERCEL_ENV: 'production' }));
  });

  it('allows a preview pointed at development, which is the intended shape', () => {
    assert.doesNotThrow(() => check({ ...url('devrefabcdefghijklmn'), VERCEL_ENV: 'preview' }));
  });

  it('refuses a ref that is really a URL — the likeliest paste', () => {
    // Silently matching nothing is the failure this catches: the guard
    // would return on every deployment and report itself as on.
    assert.throws(
      () => check({ ...url(PROD), VERCEL_ENV: 'preview' }, `https://${PROD}.supabase.co`),
      ConfigError,
    );
  });

  it('refuses a truncated or placeholder ref', () => {
    for (const bad of ['prod', 'TODO', 'your-project-ref', 'prodref.supabase.co']) {
      assert.throws(
        () => check({ ...url(PROD), VERCEL_ENV: 'production' }, bad),
        ConfigError,
        bad,
      );
    }
  });

  it('fails closed on a bad ref even where the deployment is production', () => {
    // The check runs before the environment is considered, so a malformed
    // ref is loud everywhere rather than only where it would have bitten.
    assert.throws(() => check({ ...url(PROD), VERCEL_ENV: 'production' }, 'nope!'), ConfigError);
  });

  it('is inert while no production project exists', () => {
    // Today's state. It must not fail a build for a project nobody has
    // created — but it is written now, because the dangerous window is the
    // deploy immediately after somebody creates it.
    assert.doesNotThrow(() => check({ ...url(PROD), VERCEL_ENV: 'preview' }, ''));
  });
});
