import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sendVerdict, suppressedFor, contactability } from './suppression.ts';
import { addresseesFor, unreachableReason } from './recipients.ts';
import { guardianReminder, claimApproved, wwccReminder } from './templates.ts';
import type { Recipient } from './types.ts';
import type { Guardianship, Person } from '../types.ts';

const person = (over: Partial<Person> & { id: string }): Person => ({
  clubId: 'club-1',
  legalName: { givenNames: 'Given', familyName: 'Family' },
  legalNameVerifiedAt: null,
  preferredName: null,
  dateOfBirth: '2015-01-01',
  email: null,
  ...over,
} as Person);

const recipient = (over: Partial<Recipient> = {}): Recipient => ({
  subscriberId: 's-1',
  personId: 'p-1',
  email: 'parent@example.test',
  displayName: 'Parent',
  suppression: { operationalSuppressedAt: null, marketingSuppressedAt: null },
  ...over,
});

describe('sendVerdict — BR129, the decision is ours and not the provider’s', () => {
  it('sends to a contactable person', () => {
    assert.deepEqual(sendVerdict(recipient(), 'operational'), { send: true });
  });

  it('refuses marketing to someone who unsubscribed from it', () => {
    const r = recipient({ suppression: { operationalSuppressedAt: null, marketingSuppressedAt: '2026-09-01T00:00:00Z' } });
    assert.equal(sendVerdict(r, 'marketing').send, false);
  });

  it('still sends operational mail to someone who left the newsletter (BR130)', () => {
    const r = recipient({ suppression: { operationalSuppressedAt: null, marketingSuppressedAt: '2026-09-01T00:00:00Z' } });
    assert.deepEqual(sendVerdict(r, 'operational'), { send: true });
  });

  it('refuses everything to someone who asked not to be emailed at all', () => {
    const r = recipient({ suppression: { operationalSuppressedAt: '2026-09-01T00:00:00Z', marketingSuppressedAt: null } });
    assert.equal(sendVerdict(r, 'operational').send, false);
    // And says so in words a registrar can act on: the next move is a call.
    const verdict = sendVerdict(r, 'operational');
    assert.ok(!verdict.send && verdict.reason.includes('another way'));
  });

  it('refuses a recipient with no address rather than attempting a send', () => {
    assert.equal(sendVerdict(recipient({ email: '  ' }), 'operational').send, false);
  });

  it('reports contactability for the screen', () => {
    assert.equal(contactability(recipient()), 'Contactable');
    assert.equal(contactability(recipient({ suppression: { operationalSuppressedAt: null, marketingSuppressedAt: 'x' } })), 'No club news');
    assert.equal(contactability(recipient({ suppression: { operationalSuppressedAt: 'x', marketingSuppressedAt: null } })), 'Cannot be emailed');
  });

  it('reads suppression per purpose, not as one flag', () => {
    const s = { operationalSuppressedAt: null, marketingSuppressedAt: 'x' };
    assert.equal(suppressedFor(s, 'marketing'), true);
    assert.equal(suppressedFor(s, 'operational'), false);
  });
});

describe('addresseesFor — BR131, a message reaches the responsible adult', () => {
  const child = person({ id: 'child', email: 'child@example.test' });
  const mum = person({ id: 'mum', email: 'mum@example.test', preferredName: 'Mum' });
  const dad = person({ id: 'dad', email: 'dad@example.test' });
  const people = new Map([['child', child], ['mum', mum], ['dad', dad]]);

  const guard = (over: Partial<Guardianship>): Guardianship => ({
    personId: 'child', guardianPersonId: 'mum', isAuthority: true, isContact: true, ...over,
  });

  it('writes to the guardians with authority, never to the child', () => {
    const to = addresseesFor(child, [guard({}), guard({ guardianPersonId: 'dad' })], people);
    assert.deepEqual(to.map((a) => a.personId).sort(), ['dad', 'mum']);
  });

  it('ignores a guardian who is a contact but holds no authority', () => {
    const to = addresseesFor(child, [guard({ isAuthority: false })], people);
    // Falls back to the subject rather than silently writing to nobody.
    assert.deepEqual(to.map((a) => a.personId), ['child']);
  });

  it('writes to an adult themselves when nobody holds authority', () => {
    const adult = person({ id: 'adult', email: 'adult@example.test' });
    assert.deepEqual(addresseesFor(adult, [], new Map()).map((a) => a.personId), ['adult']);
  });

  it('never includes a guardian of another child', () => {
    const to = addresseesFor(child, [guard({ personId: 'someone-else', guardianPersonId: 'dad' }), guard({})], people);
    assert.deepEqual(to.map((a) => a.personId), ['mum']);
  });

  it('drops an addressee with no email rather than inventing one', () => {
    const noEmail = new Map([['mum', person({ id: 'mum', email: null })]]);
    assert.deepEqual(addresseesFor(child, [guard({})], noEmail), []);
  });

  it('explains unreachability for the screen instead of throwing', () => {
    assert.match(unreachableReason(child, []) ?? '', /No email address recorded/);
    assert.equal(unreachableReason(child, [{ personId: 'mum', email: 'm@x.test', displayName: 'Mum' }]), null);
  });
});

describe('templates — BR128, every message carries the way out', () => {
  const ctx = { clubName: 'North Star FC', unsubscribeUrl: 'https://x.test/unsubscribe/abc', asAt: '2026-09-13' as const };

  it('lists exactly what is outstanding, in the rule’s own words', () => {
    const { subject, body } = guardianReminder.compose({
      guardianName: 'Hana',
      childName: 'Piri',
      outcomes: [
        { ruleId: 'BR2', status: 'fail', message: 'Birth certificate is missing.' },
        { ruleId: 'BR3', status: 'fail', message: '$80.32 outstanding.' },
        { ruleId: 'BR1', status: 'pass', message: 'Guardian recorded.' },
      ],
    }, ctx);

    assert.match(subject, /2 things outstanding/);
    assert.match(body, /Birth certificate is missing\./);
    assert.match(body, /\$80\.32 outstanding\./);
    // A pass is not an instruction to the family.
    assert.doesNotMatch(body, /Guardian recorded/);
  });

  it('does not send a family a list of nothing', () => {
    const { subject, body } = guardianReminder.compose(
      { guardianName: 'Hana', childName: 'Piri', outcomes: [{ ruleId: 'BR1', status: 'pass', message: 'ok' }] }, ctx);
    assert.match(subject, /is registered/);
    assert.match(body, /nothing outstanding/);
  });

  it('BR51 — lists every due clearance and says what it does not do', () => {
    const { subject, body } = wwccReminder.compose({
      secretaryName: 'Kiri',
      due: [
        { personName: 'A Coach', kind: 'WWCC', expiresOn: '2027-01-01' },
        { personName: 'B Coach', kind: 'WWCC', expiresOn: '2026-06-01' },
      ],
    }, ctx);

    assert.match(subject, /2 Working with Children Checks due/);
    assert.match(body, /A Coach — WWCC, card expires 2027-01-01/);
    assert.match(body, /B Coach — WWCC, card expires 2026-06-01/);
    // BR51's limit stated plainly: this is the nudge, not the check.
    assert.match(body, /does not check the state register itself/);
  });

  it('carries the unsubscribe link in every template', () => {
    for (const composed of [
      guardianReminder.compose({ guardianName: 'H', childName: 'P', outcomes: [] }, ctx),
      claimApproved.compose({ officialName: 'Sam', fixture: 'R3 v Coast', amount: '$45.00' }, ctx),
      wwccReminder.compose({ secretaryName: 'Kiri', due: [] }, ctx),
    ]) {
      assert.ok(composed.body.includes(ctx.unsubscribeUrl), 'a message with no way out is the failure BR128 prevents');
    }
  });

  it('does not imply the money has moved (BR118)', () => {
    const { body } = claimApproved.compose({ officialName: 'Sam', fixture: 'R3 v Coast', amount: '$45.00' }, ctx);
    assert.match(body, /usual banking/);
  });
});
