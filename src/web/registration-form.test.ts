import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { parseRegistrationForm, type FormInput, type ParseResult } from './registration-form.ts';

const TODAY = '2026-08-19';

/** A complete, valid adult submission. Tests override one field at a time. */
function adultInput(overrides: FormInput = {}): FormInput {
  return {
    legalGivenNames: 'Alexandra Marie',
    legalFamilyName: 'Nguyen',
    preferredName: 'Alex',
    dateOfBirth: '1994-03-02',
    email: 'alex@example.com',
    consentCollectionNotice: 'on',
    ...overrides,
  };
}

function minorInput(overrides: FormInput = {}): FormInput {
  return {
    ...adultInput({ dateOfBirth: '2015-06-01' }),
    guardianGivenNames: 'Mai',
    guardianFamilyName: 'Nguyen',
    guardianEmail: 'mai@example.com',
    ...overrides,
  };
}

function parse(input: FormInput): ParseResult {
  return parseRegistrationForm(input, { today: TODAY });
}

function expectOk(input: FormInput) {
  const result = parse(input);
  assert.equal(result.ok, true, `expected a valid parse, got ${JSON.stringify(result)}`);
  assert.ok(result.ok);
  return result.draft;
}

function errorsFor(input: FormInput): readonly string[] {
  const result = parse(input);
  assert.equal(result.ok, false, 'expected the parse to fail');
  assert.ok(!result.ok);
  return result.errors.map((e) => e.field);
}

describe('names (BR55)', () => {
  test('keeps the legal name and the preferred name apart', () => {
    const draft = expectOk(adultInput());
    assert.deepEqual(draft.legalName, { givenNames: 'Alexandra Marie', familyName: 'Nguyen' });
    assert.equal(draft.preferredName, 'Alex');
  });

  test('accepts a registration with no preferred name', () => {
    const draft = expectOk(adultInput({ preferredName: '' }));
    assert.equal(draft.preferredName, null);
    assert.equal(draft.legalName.givenNames, 'Alexandra Marie');
  });

  test('requires both parts of the legal name', () => {
    assert.deepEqual(errorsFor(adultInput({ legalGivenNames: '  ' })), ['legalGivenNames']);
    assert.deepEqual(errorsFor(adultInput({ legalFamilyName: '' })), ['legalFamilyName']);
  });

  test('collapses whitespace that would silently break external matching', () => {
    // A trailing space is invisible on screen and defeats BR44's
    // name + date-of-birth match against the governing body's export.
    const draft = expectOk(
      adultInput({ legalGivenNames: '  Alexandra   Marie ', legalFamilyName: ' Nguyen ' }),
    );
    assert.equal(draft.legalName.givenNames, 'Alexandra Marie');
    assert.equal(draft.legalName.familyName, 'Nguyen');
  });
});

describe('date of birth', () => {
  test('rejects a date in the future', () => {
    assert.deepEqual(errorsFor(adultInput({ dateOfBirth: '2027-01-01' })), ['dateOfBirth']);
  });

  test('rejects a date that does not exist', () => {
    assert.deepEqual(errorsFor(adultInput({ dateOfBirth: '2015-02-30' })), ['dateOfBirth']);
  });

  test('rejects a malformed date rather than guessing at it', () => {
    assert.deepEqual(errorsFor(adultInput({ dateOfBirth: '01/06/2015' })), ['dateOfBirth']);
  });

  test('rejects a mistyped century instead of registering a 900-year-old', () => {
    assert.deepEqual(errorsFor(adultInput({ dateOfBirth: '1194-03-02' })), ['dateOfBirth']);
  });

  test('accepts a leap day', () => {
    const draft = expectOk(adultInput({ dateOfBirth: '1996-02-29' }));
    assert.equal(draft.dateOfBirth, '1996-02-29');
  });

  test('accepts a leap day for a minor, who still needs a guardian', () => {
    const draft = expectOk(minorInput({ dateOfBirth: '2016-02-29' }));
    assert.equal(draft.dateOfBirth, '2016-02-29');
    assert.equal(draft.isMinor, true);
  });
});

describe('guardians (BR1)', () => {
  test('requires a guardian for a minor', () => {
    const fields = errorsFor(
      minorInput({ guardianGivenNames: '', guardianFamilyName: '', guardianEmail: '' }),
    );
    assert.deepEqual(fields, ['guardianGivenNames', 'guardianFamilyName', 'guardianEmail']);
  });

  test('requires a way to reach the guardian', () => {
    assert.deepEqual(errorsFor(minorInput({ guardianEmail: '' })), ['guardianEmail']);
  });

  test('records the guardian for a minor', () => {
    const draft = expectOk(minorInput());
    assert.equal(draft.isMinor, true);
    assert.deepEqual(draft.guardian?.legalName, { givenNames: 'Mai', familyName: 'Nguyen' });
    assert.equal(draft.guardian?.email, 'mai@example.com');
  });

  test('does not ask an adult for a guardian', () => {
    const draft = expectOk(adultInput());
    assert.equal(draft.isMinor, false);
    assert.equal(draft.guardian, null);
  });

  test('treats the eighteenth birthday as an adult (BR67)', () => {
    // Exactly 18 today: authority has transferred, so no guardian is required
    // and its absence must not fail the parse.
    const draft = expectOk(adultInput({ dateOfBirth: '2008-08-19' }));
    assert.equal(draft.isMinor, false);
    assert.equal(draft.guardian, null);
  });

  test('treats the day before the eighteenth birthday as a minor', () => {
    assert.deepEqual(
      errorsFor(
        adultInput({
          dateOfBirth: '2008-08-20',
          guardianGivenNames: '',
          guardianFamilyName: '',
          guardianEmail: '',
        }),
      ),
      ['guardianGivenNames', 'guardianFamilyName', 'guardianEmail'],
    );
  });
});

describe('consent (BR48, BR56, BR57)', () => {
  test('refuses to proceed without the collection notice', () => {
    assert.deepEqual(errorsFor(adultInput({ consentCollectionNotice: undefined })), [
      'consentCollectionNotice',
    ]);
  });

  test('defaults publicity consent to off', () => {
    // BR57: the default is no consent, and refusing must never block.
    const draft = expectOk(adultInput());
    assert.equal(draft.consents.publicity, false);
    assert.equal(draft.consents.photograph, false);
  });

  test('records the photograph and publicity consents independently', () => {
    const draft = expectOk(adultInput({ consentPhotograph: 'on' }));
    assert.equal(draft.consents.photograph, true);
    assert.equal(draft.consents.publicity, false);

    const both = expectOk(adultInput({ consentPhotograph: 'on', consentPublicity: 'on' }));
    assert.equal(both.consents.photograph, true);
    assert.equal(both.consents.publicity, true);
  });

  test('granting publicity alone never substitutes for the collection notice', () => {
    assert.deepEqual(
      errorsFor(adultInput({ consentCollectionNotice: undefined, consentPublicity: 'on' })),
      ['consentCollectionNotice'],
    );
  });
});

describe('email', () => {
  test('is optional for the player', () => {
    const draft = expectOk(adultInput({ email: '' }));
    assert.equal(draft.email, null);
  });

  test('is lowercased so it matches on the way back', () => {
    const draft = expectOk(adultInput({ email: '  Alex@Example.COM ' }));
    assert.equal(draft.email, 'alex@example.com');
  });

  test('rejects an address with no domain', () => {
    assert.deepEqual(errorsFor(adultInput({ email: 'alex@example' })), ['email']);
  });
});

describe('reporting', () => {
  test('reports every problem at once rather than one per submission', () => {
    // A family sent round the loop once per mistake is the failure this
    // whole slice exists to remove.
    const fields = errorsFor({
      legalGivenNames: '',
      legalFamilyName: '',
      dateOfBirth: 'not-a-date',
      email: 'bad',
    });
    assert.deepEqual(fields, [
      'legalGivenNames',
      'legalFamilyName',
      'dateOfBirth',
      'email',
      'consentCollectionNotice',
    ]);
  });

  test('says what to do, not merely that something is wrong', () => {
    const result = parse(adultInput({ legalGivenNames: '' }));
    assert.ok(!result.ok);
    assert.match(result.errors[0]!.message, /passport or birth certificate/);
  });
});
