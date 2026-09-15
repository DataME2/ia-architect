import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  assertNotPreviewAgainstProduction,
  ConfigError,
  PRODUCTION_PROJECT_REF,
  readCronSecret,
  readPublicConfig,
  readServiceConfig,
  validProjectRef,
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

  it('is inert where no production project exists', () => {
    // The state this guard shipped in, and the one it must not fail a build
    // in: an empty ref is a project nobody has created.
    assert.doesNotThrow(() => check({ ...url(PROD), VERCEL_ENV: 'preview' }, ''));
  });

  // --- and now the real one ------------------------------------------------
  //
  // Every test above injects a ref. These drive the **shipped constant**,
  // which is what actually protects the real database — and they only became
  // possible when a production project existed. Their job is to catch the
  // guard being silently disarmed: blanking PRODUCTION_PROJECT_REF, or
  // editing it to something that matches no URL, turns every assertion above
  // into a statement about a value nothing uses.

  it('is armed — the shipped ref is a real one, not a placeholder', () => {
    assert.ok(
      validProjectRef(PRODUCTION_PROJECT_REF),
      'PRODUCTION_PROJECT_REF is empty or malformed, so the guard matches no URL and ' +
        'protects nothing. A production project exists; if it has been decommissioned, ' +
        'that is a deliberate change and this test is where it gets argued.',
    );
  });

  it('refuses a preview pointed at the real production project', () => {
    assert.throws(
      () =>
        assertNotPreviewAgainstProduction({
          NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
          VERCEL_ENV: 'preview',
        }),
      ConfigError,
    );
  });

  it('lets the real production deployment through', () => {
    assert.doesNotThrow(() =>
      assertNotPreviewAgainstProduction({
        NEXT_PUBLIC_SUPABASE_URL: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        VERCEL_ENV: 'production',
      }),
    );
  });

  it('leaves the development project alone in every environment', () => {
    // The check must be invisible to everyday work: local development and
    // every preview point at the development project and must never trip it.
    for (const env of [undefined, 'development', 'preview', 'production']) {
      assert.doesNotThrow(
        () =>
          assertNotPreviewAgainstProduction({
            NEXT_PUBLIC_SUPABASE_URL: 'https://sxsloxdtpcjpdobwpwsm.supabase.co',
            ...(env === undefined ? {} : { VERCEL_ENV: env }),
          }),
        String(env),
      );
    }
  });
});
