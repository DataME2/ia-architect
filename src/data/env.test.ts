import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ConfigError, readPublicConfig, readServiceConfig } from './env.ts';

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
