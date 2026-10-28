import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { composeEnquiryAlert } from '../domain/messaging/platform-alert.ts';
import { parseEnquiry } from './enquiry-form.ts';
import { relayPayload } from './enquiry-relay.ts';

describe('relayPayload — BR189', () => {
  const parsed = parseEnquiry({
    clubName: 'Brisbane Bayside FC',
    email: 'Sec@Bayside.test',
    request: 'demo',
  });
  if (!parsed.ok) throw new Error(parsed.error);

  it('says exactly what the Resend alert says, and replies to the club', () => {
    const alert = composeEnquiryAlert(parsed.enquiry);
    const payload = relayPayload(parsed.enquiry, 'test-key');
    assert.equal(payload['subject'], alert.subject);
    assert.equal(payload['message'], alert.body);
    assert.equal(payload['replyto'], 'sec@bayside.test');
    assert.equal(payload['access_key'], 'test-key');
  });
});
