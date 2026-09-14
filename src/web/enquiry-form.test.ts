import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { parseEnquiry } from './enquiry-form.ts';

describe('parseEnquiry — BR144, two required fields and six invited ones', () => {
  const minimum = { clubName: 'Brisbane Bayside FC', email: 'sec@bayside.test' };

  it('accepts a club name and an address and nothing else', () => {
    const parsed = parseEnquiry(minimum);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.enquiry.clubName, 'Brisbane Bayside FC');
    assert.equal(parsed.ok && parsed.enquiry.currentSystem, null);
  });

  it('refuses an enquiry with no club, naming why it is the one thing needed', () => {
    const parsed = parseEnquiry({ email: 'sec@bayside.test' });
    assert.equal(parsed.ok, false);
    assert.match(parsed.ok === false ? parsed.error : '', /which club/i);
  });

  it('refuses an enquiry with nowhere to reply', () => {
    const parsed = parseEnquiry({ clubName: 'Brisbane Bayside FC' });
    assert.equal(parsed.ok, false);
  });

  it('treats whitespace as absence, in the required fields and the optional ones', () => {
    assert.equal(parseEnquiry({ ...minimum, clubName: '   ' }).ok, false);

    const parsed = parseEnquiry({ ...minimum, currentSystem: '  ', note: '\n\t' });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.enquiry.currentSystem, null);
    assert.equal(parsed.ok && parsed.enquiry.note, null);
  });

  it('lowercases the address so one club is one lead', () => {
    const parsed = parseEnquiry({ ...minimum, email: 'SEC@Bayside.TEST' });
    assert.equal(parsed.ok && parsed.enquiry.email, 'sec@bayside.test');
  });

  it('keeps the club name as typed — it is a name, not a key', () => {
    const parsed = parseEnquiry({ ...minimum, clubName: '  Brisbane Bayside FC  ' });
    assert.equal(parsed.ok && parsed.enquiry.clubName, 'Brisbane Bayside FC');
  });

  it('is permissive about the address, like the demonstration door', () => {
    assert.equal(parseEnquiry({ ...minimum, email: 'a@b' }).ok, true);
  });

  it('refuses something that is not an address at all', () => {
    for (const email of ['nobody', '@bayside.test', 'sec@', 'a b@c.test']) {
      assert.equal(parseEnquiry({ ...minimum, email }).ok, false, email);
    }
  });

  it('treats an absent checkbox as unticked — consent is only the affirmative case', () => {
    for (const marketingConsent of [undefined, null, '', 'off', false, 'true']) {
      const parsed = parseEnquiry({ ...minimum, marketingConsent });
      assert.equal(parsed.ok && parsed.enquiry.marketingConsent, false, String(marketingConsent));
    }
    const ticked = parseEnquiry({ ...minimum, marketingConsent: 'on' });
    assert.equal(ticked.ok && ticked.enquiry.marketingConsent, true);
  });

  it('carries every invited field through when it is given', () => {
    const parsed = parseEnquiry({
      ...minimum,
      contactName: 'A Secretary',
      contactRole: 'Secretary',
      jurisdiction: 'AU-QLD',
      clubSize: 'about 400, mostly MiniRoos',
      currentSystem: 'Majestri',
      note: 'Season starts in March.',
      phone: '0400 000 000',
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.ok && parsed.enquiry.currentSystem, 'Majestri');
    assert.equal(parsed.ok && parsed.enquiry.clubSize, 'about 400, mostly MiniRoos');
  });
});
