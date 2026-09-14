/**
 * `alertPlatform` never throws — asserted, because the claim is the point.
 *
 * The enquiry is the thing that must survive. A club that typed its details
 * and got an error because an email provider was down has been failed
 * twice, so every way the alert can go wrong has to come back as a recorded
 * outcome rather than as an exception the action has to remember to catch.
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { alertPlatform } from './enquiries.ts';
import type { MessageTransport } from './messaging.ts';
import type { ClubEnquiry } from '../web/enquiry-form.ts';

const ENQUIRY: ClubEnquiry = {
  clubName: 'Brisbane Bayside FC',
  email: 'sec@bayside.test',
  contactName: null,
  contactRole: null,
  jurisdiction: null,
  clubSize: null,
  currentSystem: 'Majestri',
  note: null,
  phone: null,
  marketingConsent: false,
};

function transport(send: MessageTransport['send']): MessageTransport {
  return { name: 'test', send };
}

describe('alertPlatform — BR146', () => {
  it('sends to the configured address and reports success', async () => {
    const sent: { to: string; subject: string; body: string }[] = [];
    const result = await alertPlatform(
      ENQUIRY,
      transport(async (to, subject, body) => {
        sent.push({ to, subject, body });
      }),
      'leads@example.test',
    );

    assert.deepEqual(result, { notified: true, error: null });
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, 'leads@example.test');
    assert.match(sent[0]?.subject ?? '', /Brisbane Bayside FC/);
    assert.match(sent[0]?.subject ?? '', /Majestri/);
  });

  it('reports the absence of an address rather than sending nowhere', async () => {
    let called = false;
    const result = await alertPlatform(
      ENQUIRY,
      transport(async () => {
        called = true;
      }),
      null,
    );

    assert.equal(result.notified, false);
    assert.match(result.error ?? '', /PLATFORM_ALERT_TO/);
    assert.equal(called, false, 'it tried to send with nowhere to send to');
  });

  it('reports the absence of a provider — never a silent success', async () => {
    const result = await alertPlatform(ENQUIRY, null, 'leads@example.test');
    assert.equal(result.notified, false);
    assert.match(result.error ?? '', /No email provider/);
  });

  it('turns a rejecting provider into a recorded outcome, not an exception', async () => {
    const result = await alertPlatform(
      ENQUIRY,
      transport(async () => {
        throw new Error('Provider refused the message (422).');
      }),
      'leads@example.test',
    );

    assert.equal(result.notified, false);
    assert.equal(result.error, 'Provider refused the message (422).');
  });

  it('survives a provider that throws something that is not an Error', async () => {
    const result = await alertPlatform(
      ENQUIRY,
      transport(async () => {
        // eslint-disable-next-line no-throw-literal
        throw 'socket hang up';
      }),
      'leads@example.test',
    );

    assert.equal(result.notified, false);
    assert.equal(result.error, 'The provider rejected the alert.');
  });

  it('gives up on a provider that hangs, so the enquirer is not left waiting', async () => {
    const started = Date.now();
    const result = await alertPlatform(
      ENQUIRY,
      // Never settles. Without the timeout this test would hang, which is
      // exactly what the club's browser would do.
      transport(() => new Promise<void>(() => {})),
      'leads@example.test',
      50,
    );

    assert.equal(result.notified, false);
    assert.match(result.error ?? '', /did not answer/);
    assert.ok(Date.now() - started < 5_000, 'the timeout did not fire');
  });
});
