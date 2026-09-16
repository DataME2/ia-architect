import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { ConfigError } from './env.ts';
import { messagingUnavailableReason } from './messaging.ts';

describe('messagingUnavailableReason', () => {
  it('turns a ConfigError into a reason a registrar can act on', () => {
    const reason = messagingUnavailableReason(
      new ConfigError('NEXT_PUBLIC_SITE_URL', 'is not set — copy .env.example to .env.local and fill it in'),
    );
    assert.ok(reason !== null);
    assert.match(reason, /NEXT_PUBLIC_SITE_URL/);
    assert.match(reason, /deployment configuration/);
  });

  it('is null for anything that is not this specific misconfiguration, so a real bug is not swallowed', () => {
    assert.equal(messagingUnavailableReason(new TypeError('boom')), null);
    assert.equal(messagingUnavailableReason(new Error('boom')), null);
    assert.equal(messagingUnavailableReason('not even an Error'), null);
    assert.equal(messagingUnavailableReason(null), null);
  });
});
