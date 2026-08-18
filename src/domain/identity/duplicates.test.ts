import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { person } from '../test-fixtures.ts';
import { findDuplicateCandidates } from './br5-duplicate-candidates.ts';

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
