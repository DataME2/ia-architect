import { strict as assert } from 'node:assert';
import { describe, it, test } from 'node:test';
import { person } from '../test-fixtures.ts';
import { findDuplicateCandidates, findDuplicatePairs } from './br5-duplicate-candidates.ts';

describe('BR5 — duplicate candidates', () => {
  const subject = person({ id: 'a', email: 'family@example.test' });

  it('flags the same legal name and date of birth', () => {
    const other = person({ id: 'b', preferredName: 'Lexi', email: null });
    const found = findDuplicateCandidates(subject, [other]);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.basis, 'legal-name-and-dob');
  });

  it('ignores case and extra whitespace in names', () => {
    const other = person({
      id: 'b',
      legalName: { givenNames: '  alexandra   jane ', familyName: 'NGUYEN' },
    });
    assert.equal(findDuplicateCandidates(subject, [other]).length, 1);
  });

  it('does not flag a different date of birth, however similar the name', () => {
    const other = person({ id: 'b', dateOfBirth: '2015-03-02' });
    assert.equal(findDuplicateCandidates(subject, [other]).length, 0);
  });

  it('flags a shared email and date of birth — siblings on one family address', () => {
    const other = person({
      id: 'b',
      legalName: { givenNames: 'Thomas', familyName: 'Nguyen' },
      email: 'family@example.test',
    });
    const found = findDuplicateCandidates(subject, [other]);
    assert.equal(found[0]?.basis, 'email-and-dob');
  });

  it('never matches a person against themselves', () => {
    assert.equal(findDuplicateCandidates(subject, [subject]).length, 0);
  });

  it('returns candidates rather than merging anything', () => {
    const other = person({ id: 'b' });
    const found = findDuplicateCandidates(subject, [other]);
    assert.equal(found[0]?.personId, 'a');
    assert.equal(found[0]?.otherPersonId, 'b');
    assert.match(found[0]!.evidence, /date of birth/);
  });
});

describe('BR5 restated — email decides, in both directions', () => {
  const GUARDIAN_DOB = '1900-01-01';

  function guardianRecord(id: string, given: string, family: string, email: string | null) {
    return person({
      id,
      legalName: { givenNames: given, familyName: family },
      dateOfBirth: GUARDIAN_DOB,
      email,
    });
  }

  test('one parent recorded four times under four names is caught by the email', () => {
    // Exactly what this club accumulated: same human, same address, and not
    // two names alike between them.
    const karens = [
      guardianRecord('k1', 'Karen', 'Tavera Mayorga', 'karen@example.test'),
      guardianRecord('k2', 'K', 'Alfonso Reina Lopez', 'karen@example.test'),
      guardianRecord('k3', 'Karen', 'Alfonso Reina', 'KAREN@example.test'),
      guardianRecord('k4', 'Karen', 'Alfonso Reina', ' karen@example.test '),
    ];

    const pairs = findDuplicatePairs(karens);
    assert.equal(pairs.length, 6, 'every pairing among the four, listed once each');
    assert.ok(pairs.every((p) => p.confidence === 'confirmed'));
    assert.ok(pairs.every((p) => p.basis === 'email-and-dob'));
  });

  test('two different families with the same name are NOT duplicates', () => {
    // The half that was missing. A club really does have two Nguyens.
    const pairs = findDuplicatePairs([
      person({ id: 'a', email: 'one@example.test' }),
      person({ id: 'b', email: 'two@example.test' }),
    ]);
    assert.deepEqual(pairs, []);
  });

  test('siblings on one family email are NOT one child', () => {
    // The trap: matching on the address alone would merge two children.
    const pairs = findDuplicatePairs([
      person({ id: 'child-1', dateOfBirth: '2014-03-02', email: 'family@example.test' }),
      person({
        id: 'child-2',
        dateOfBirth: '2018-02-01',
        legalName: { givenNames: 'Santiago', familyName: 'Nguyen' },
        email: 'family@example.test',
      }),
    ]);
    assert.deepEqual(pairs, [], 'different dates of birth, so different children');
  });

  test('same name and date of birth with no email is a possible, not a confirmed', () => {
    const pairs = findDuplicatePairs([
      person({ id: 'a', email: null }),
      person({ id: 'b', email: null }),
    ]);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.confidence, 'possible');
    assert.equal(pairs[0]?.basis, 'legal-name-and-dob');
  });

  test('one record with an email and one without is still worth asking about', () => {
    const pairs = findDuplicatePairs([
      person({ id: 'a', email: 'someone@example.test' }),
      person({ id: 'b', email: null }),
    ]);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.confidence, 'possible');
  });

  test('a pair is listed once, not once per direction', () => {
    const pairs = findDuplicatePairs([
      guardianRecord('a', 'Karen', 'One', 'k@example.test'),
      guardianRecord('b', 'Karen', 'Two', 'k@example.test'),
    ]);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0]?.aId, 'a');
    assert.equal(pairs[0]?.bId, 'b');
  });

  test('confirmed pairs sort ahead of possible ones', () => {
    const pairs = findDuplicatePairs([
      person({ id: 'n1', email: null }),
      person({ id: 'n2', email: null }),
      guardianRecord('e1', 'Karen', 'One', 'k@example.test'),
      guardianRecord('e2', 'Karen', 'Two', 'k@example.test'),
    ]);
    assert.equal(pairs[0]?.confidence, 'confirmed');
    assert.equal(pairs.at(-1)?.confidence, 'possible');
  });

  test('nobody is their own duplicate', () => {
    assert.deepEqual(findDuplicatePairs([person({ id: 'solo' })]), []);
  });
});
