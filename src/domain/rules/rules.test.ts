import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { ageAt, isMinor } from '../types.ts';
import { consent, context, guardian, person, registration } from '../test-fixtures.ts';
import { blockers, canComplete, evaluateRegistration, REGISTRATION_RULES } from './index.ts';

describe('age', () => {
  it('counts whole years', () => {
    assert.equal(ageAt('2000-01-01', '2026-01-01'), 26);
  });

  it('does not round up before the birthday', () => {
    assert.equal(ageAt('2008-08-08', '2026-08-07'), 17);
    assert.equal(ageAt('2008-08-08', '2026-08-08'), 18);
  });

  it('treats the eighteenth birthday as no longer a minor (BR67)', () => {
    const p = person({ dateOfBirth: '2008-08-07' });
    assert.equal(isMinor(p, '2026-08-06'), true);
    assert.equal(isMinor(p, '2026-08-07'), false);
  });
});

describe('BR55 — legal name', () => {
  it('passes when present and verified', () => {
    const [outcome] = evaluateRegistration(context()).filter((o) => o.ruleId === 'BR55');
    assert.equal(outcome?.status, 'pass');
  });

  it('fails when the legal name is blank', () => {
    const ctx = context({ person: person({ legalName: { givenNames: '  ', familyName: 'Nguyen' } }) });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR55');
    assert.equal(outcome?.status, 'fail');
  });

  it('fails when the legal name was never checked against a document', () => {
    const ctx = context({ person: person({ legalNameVerifiedAt: null }) });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR55');
    assert.equal(outcome?.status, 'fail');
    assert.match(outcome!.message, /identity document/);
  });

  it('does not care what the preferred name is', () => {
    const ctx = context({ person: person({ preferredName: 'Bazza' }) });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR55');
    assert.equal(outcome?.status, 'pass');
  });
});

describe('BR1 — guardian for a minor', () => {
  it('requires a guardian for someone under 18', () => {
    const ctx = context({ guardianships: [] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR1');
    assert.equal(outcome?.status, 'fail');
  });

  it('does not accept a contact-only guardian as authority (BR67)', () => {
    const ctx = context({ guardianships: [guardian({ isAuthority: false, isContact: true })] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR1');
    assert.equal(outcome?.status, 'fail');
  });

  it('does not require a guardian for an adult', () => {
    const ctx = context({
      person: person({ dateOfBirth: '1990-01-01' }),
      guardianships: [],
      consents: [consent({ grantedByPersonId: 'person-1' })],
    });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR1');
    assert.equal(outcome?.status, 'pass');
  });
});

describe('BR48 — consent', () => {
  it('fails when the collection notice was never acknowledged', () => {
    const ctx = context({ consents: [] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR48');
    assert.equal(outcome?.status, 'fail');
  });

  it('fails when the consent has been revoked', () => {
    const ctx = context({ consents: [consent({ revokedAt: '2026-06-01T00:00:00Z' })] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR48');
    assert.equal(outcome?.status, 'fail');
  });

  it("fails when a minor's consent came from someone without authority", () => {
    const ctx = context({ consents: [consent({ grantedByPersonId: 'person-uncle' })] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR48');
    assert.equal(outcome?.status, 'fail');
    assert.match(outcome!.message, /authority/);
  });

  it('ignores a consent for a different purpose', () => {
    const ctx = context({ consents: [consent({ purpose: 'PUBLICITY' })] });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR48');
    assert.equal(outcome?.status, 'fail');
  });

  it('does not require guardian authority for an adult', () => {
    const ctx = context({
      person: person({ dateOfBirth: '1990-01-01' }),
      guardianships: [],
      consents: [consent({ grantedByPersonId: 'person-1' })],
    });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR48');
    assert.equal(outcome?.status, 'pass');
  });
});

describe('BR2 — required documents', () => {
  it('names what is missing rather than saying "incomplete"', () => {
    const ctx = context({
      registration: registration({
        requiredDocumentTypes: ['birth-certificate', 'proof-of-address'],
        providedDocumentTypes: ['birth-certificate'],
      }),
    });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR2');
    assert.equal(outcome?.status, 'fail');
    assert.match(outcome!.message, /proof-of-address/);
  });

  it('passes when nothing is required', () => {
    const ctx = context({
      registration: registration({ requiredDocumentTypes: [], providedDocumentTypes: [] }),
    });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR2');
    assert.equal(outcome?.status, 'pass');
  });
});

describe('BR3 — outstanding payment', () => {
  it('blocks while money is owed', () => {
    const ctx = context({ registration: registration({ outstandingAmountCents: 12_500 }) });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR3');
    assert.equal(outcome?.status, 'fail');
    assert.match(outcome!.message, /\$125\.00/);
  });

  it('does not block on a credit', () => {
    const ctx = context({ registration: registration({ outstandingAmountCents: -500 }) });
    const outcome = evaluateRegistration(ctx).find((o) => o.ruleId === 'BR3');
    assert.equal(outcome?.status, 'pass');
  });
});

describe('the rule set', () => {
  it('returns one outcome per rule, passes included', () => {
    const outcomes = evaluateRegistration(context());
    assert.equal(outcomes.length, REGISTRATION_RULES.length);
  });

  it('has no duplicate rule identifiers', () => {
    const ids = REGISTRATION_RULES.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('completes a clean registration and blocks a broken one', () => {
    assert.equal(canComplete(context()), true);
    const broken = context({ guardianships: [], consents: [] });
    assert.equal(canComplete(broken), false);
    assert.equal(blockers(evaluateRegistration(broken)).length, 2);
  });
});
