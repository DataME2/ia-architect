import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { composeEnquiryAlert, type EnquiryAlertInput } from './platform-alert.ts';

const bare: EnquiryAlertInput = {
  clubName: 'Brisbane Bayside FC',
  email: 'sec@bayside.test',
  contactName: null,
  contactRole: null,
  jurisdiction: null,
  clubSize: null,
  currentSystem: null,
  note: null,
  phone: null,
  marketingConsent: false,
};

const full: EnquiryAlertInput = {
  ...bare,
  contactName: 'A Secretary',
  contactRole: 'Secretary',
  jurisdiction: 'AU-QLD',
  clubSize: 'about 400, mostly MiniRoos',
  currentSystem: 'Majestri',
  note: 'Season starts in March.',
  phone: '0400 000 000',
  marketingConsent: true,
};

describe('composeEnquiryAlert — BR146', () => {
  it('puts the club and the incumbent in the subject, because that decides the reply', () => {
    assert.equal(composeEnquiryAlert(full).subject, 'New enquiry: Brisbane Bayside FC — on Majestri');
  });

  it('names the club alone when they did not say what they run', () => {
    assert.equal(composeEnquiryAlert(bare).subject, 'New enquiry: Brisbane Bayside FC');
  });

  it('omits what the club left blank rather than rendering it as unknown', () => {
    const { body } = composeEnquiryAlert(bare);
    assert.ok(!body.includes('Runs today'), 'an absent answer became a labelled blank');
    assert.ok(!body.includes('Phone'), 'an absent phone became a labelled blank');
    // Only a *labelled* dash would be the defect. The closing sentence
    // uses an em dash in ordinary prose, which is not a blank field.
    assert.ok(!/^ {2}\w[\w ]*\s+—\s*$/m.test(body), 'a dash stood in for something nobody said');
    assert.ok(body.includes('Brisbane Bayside FC'));
    assert.ok(body.includes('sec@bayside.test'));
  });

  it('falls back to the address when no name was given, so the contact line is never empty', () => {
    assert.ok(composeEnquiryAlert(bare).body.includes('Contact     sec@bayside.test'));
    assert.ok(composeEnquiryAlert(full).body.includes('A Secretary, Secretary'));
  });

  it('carries every answer the club did give', () => {
    const { body } = composeEnquiryAlert(full);
    for (const expected of ['AU-QLD', 'about 400, mostly MiniRoos', 'Majestri', '0400 000 000']) {
      assert.ok(body.includes(expected), expected);
    }
    assert.ok(body.includes('Season starts in March.'));
  });

  it('says which kind of reply the consent permits, in both directions', () => {
    assert.match(composeEnquiryAlert(full).body, /opted in/);
    assert.match(composeEnquiryAlert(bare).body, /did not opt in[\s\S]*send nothing else/);
  });

  it('carries no unsubscribe link — BR128 is about mail a person gets about themselves', () => {
    for (const input of [bare, full]) {
      const { body } = composeEnquiryAlert(input);
      assert.ok(!/unsubscribe/i.test(body), 'an operator alert offered an unsubscribe');
    }
  });

  it('says plainly that nothing was granted, where the reader might assume otherwise', () => {
    assert.match(composeEnquiryAlert(full).body, /creates no club, account or membership/);
  });

  it('carries nothing from inside a club — every field comes from the enquiry itself', () => {
    // BR146's third clause, asserted as a property of the input type: the
    // body is built only from `EnquiryAlertInput`, so the day somebody adds
    // a tenant-derived field this test is where the argument happens.
    const { body } = composeEnquiryAlert(full);
    const supplied = [
      full.clubName, full.email, full.contactName, full.contactRole, full.jurisdiction,
      full.clubSize, full.currentSystem, full.note, full.phone,
    ].filter((v): v is string => v !== null);

    const words = body.split(/\s+/).filter((w) => /^[A-Z][a-z]+$/.test(w));
    const accountedFor = (word: string) =>
      supplied.some((value) => value.includes(word)) ||
      ['New', 'They', 'Nobody', 'Reply', 'Replying', 'Club', 'Where', 'Size', 'Runs', 'Contact',
       'Email', 'Phone', 'The', 'Season', 'Send'].includes(word);

    for (const word of words) {
      assert.ok(accountedFor(word), `"${word}" is in the alert and came from nowhere in the input`);
    }
  });
});
