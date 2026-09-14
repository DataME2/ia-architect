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
import { alertInputFor, alertPlatform, alertsPending, type Enquiry } from './enquiries.ts';
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

describe('alertsPending — BR147, delivery is terminal', () => {
  const base = {
    email: 'sec@bayside.test',
    phone: null,
    clubName: 'Brisbane Bayside FC',
    jurisdiction: null,
    contactName: null,
    contactRole: null,
    clubSize: null,
    currentSystem: null,
    note: null,
    source: 'enquiry',
    enquiredAt: '2026-09-14T00:00:00Z',
    firstSeenAt: '2026-09-14T00:00:00Z',
    lastSeenAt: '2026-09-14T00:00:00Z',
    marketingConsentAt: null,
    notifiedAt: null,
    notifyError: null,
    notifyAttempts: 1,
    notifyAttemptedAt: '2026-09-14T00:00:00Z',
  };

  it('selects an enquiry whose alert failed', () => {
    const pending = alertsPending([{ ...base, notifyError: 'provider down' }]);
    assert.equal(pending.length, 1);
  });

  it('never selects one that was delivered, however many times it failed first', () => {
    // The obvious implementation of a retry — send everything not confirmed
    // — emails an operator three times about one club, and an operator
    // emailed three times about one club stops reading the alerts.
    const delivered = { ...base, notifiedAt: '2026-09-14T01:00:00Z', notifyAttempts: 4 };
    assert.deepEqual(alertsPending([delivered]), []);
  });

  it('does not select one that was never attempted', () => {
    // Null/null is the third state: a row predating the alert entirely.
    assert.deepEqual(alertsPending([base]), []);
  });

  it('does not select somebody who only looked at the demonstration club', () => {
    const looker = { ...base, clubName: null, enquiredAt: null, notifyAttempts: 0 };
    assert.deepEqual(alertsPending([looker]), []);
  });
});

describe('a retried alert is the alert that failed', () => {
  it('composes identically from a stored row and from the submitted form', async () => {
    // The divergence this guards against is one-sided and invisible: the
    // first alert is built from the form a visitor submitted and a retry is
    // built from the row it became, so a field that maps wrongly is only
    // ever wrong in the retried copy — the one nobody is watching, sent
    // when something has already gone wrong once.
    const form: ClubEnquiry = {
      clubName: 'Brisbane Bayside FC',
      email: 'sec@bayside.test',
      contactName: 'A Secretary',
      contactRole: 'Secretary',
      jurisdiction: 'AU-QLD',
      clubSize: 'about 400, mostly MiniRoos',
      currentSystem: 'Majestri',
      note: 'Season starts in March.',
      phone: '0400 000 000',
      marketingConsent: true,
    };

    const stored: Enquiry = {
      email: form.email,
      phone: form.phone,
      clubName: form.clubName,
      jurisdiction: form.jurisdiction,
      contactName: form.contactName,
      contactRole: form.contactRole,
      clubSize: form.clubSize,
      currentSystem: form.currentSystem,
      note: form.note,
      source: 'enquiry',
      enquiredAt: '2026-09-14T00:00:00Z',
      firstSeenAt: '2026-09-14T00:00:00Z',
      lastSeenAt: '2026-09-14T00:00:00Z',
      // The one field whose shape differs: a moment in the row, a boolean
      // on the form.
      marketingConsentAt: '2026-09-14T00:00:00Z',
      notifiedAt: null,
      notifyError: 'provider down',
      notifyAttempts: 1,
      notifyAttemptedAt: '2026-09-14T00:00:00Z',
    };

    const sent: { subject: string; body: string }[] = [];
    const capture = { name: 'test', send: async (_to: string, subject: string, body: string) => {
      sent.push({ subject, body });
    } };

    await alertPlatform(form, capture, 'leads@example.test');
    await alertPlatform(alertInputFor(stored), capture, 'leads@example.test');

    assert.equal(sent.length, 2);
    assert.deepEqual(sent[1], sent[0], 'the retried alert is not the alert that failed');
  });

  it('falls back to the address when a stored row carries no club name', () => {
    const looker: Enquiry = {
      email: 'someone@example.test', phone: null, clubName: null, jurisdiction: null,
      contactName: null, contactRole: null, clubSize: null, currentSystem: null, note: null,
      source: 'demo', enquiredAt: null, firstSeenAt: '2026-09-14T00:00:00Z',
      lastSeenAt: '2026-09-14T00:00:00Z', marketingConsentAt: null, notifiedAt: null,
      notifyError: null, notifyAttempts: 0, notifyAttemptedAt: null,
    };
    assert.equal(alertInputFor(looker).clubName, 'someone@example.test');
  });
});
