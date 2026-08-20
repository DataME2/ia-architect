import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { consent, guardian, person, registration, CLUB, TODAY } from '../test-fixtures.ts';
import { buildSubmissionPack, recordsForHandover } from './build-pack.ts';
import { exclusionsToCsv, PACK_COLUMNS, packToCsv } from './serialise.ts';
import { isEligibleToPlay, statusAfterHandover, statusAfterSubmissionOutcome } from './status.ts';
import type { PackCandidate, PackOptions } from './types.ts';

const GUARDIAN = person({
  id: 'person-guardian',
  legalName: { givenNames: 'Mai', familyName: 'Nguyen' },
  dateOfBirth: '1986-05-20',
  email: 'mai@example.test',
});

const OPTIONS: PackOptions = {
  clubId: CLUB,
  seasonId: 'season-2026',
  version: 1,
  generatedAt: '2026-08-07T02:00:00Z',
  generatedByUserId: 'user-registrar',
  includePhotographs: false,
  asAt: TODAY,
};

function candidate(overrides: Partial<PackCandidate> = {}): PackCandidate {
  return {
    registration: registration(),
    person: person(),
    guardianships: [guardian()],
    guardianPeople: [GUARDIAN],
    consents: [consent()],
    paymentPlan: null,
    payments: [],
    duplicateCandidates: [],
    ...overrides,
  };
}

describe('building a pack', () => {
  it('includes a clean registration', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    assert.equal(pack.rows.length, 1);
    assert.equal(pack.excluded.length, 0);
    assert.deepEqual(pack.manifest, ['person-1']);
  });

  it('carries the legal name and never the preferred one (BR55)', () => {
    const pack = buildSubmissionPack(
      [candidate({ person: person({ preferredName: 'Alex' }) })],
      OPTIONS,
    );
    const csv = packToCsv(pack);
    assert.match(csv, /Alexandra Jane/);
    assert.doesNotMatch(csv, /Alex,/);
    assert.equal(JSON.stringify(pack.rows[0]).includes('Alex"'), false);
  });

  it('names the guardian with authority', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    assert.equal(pack.rows[0]?.guardianLegalName, 'Mai Nguyen');
    assert.equal(pack.rows[0]?.guardianEmail, 'mai@example.test');
  });

  it('excludes a registration that fails validation, naming the rules', () => {
    const pack = buildSubmissionPack(
      [candidate({ person: person({ legalNameVerifiedAt: null }) })],
      OPTIONS,
    );
    assert.equal(pack.rows.length, 0);
    assert.equal(pack.excluded[0]?.reason, 'validation-failed');
    assert.deepEqual(pack.excluded[0]?.ruleIds, ['BR55']);
  });

  it('excludes an unresolved duplicate rather than guessing (BR5)', () => {
    const pack = buildSubmissionPack(
      [candidate({
        duplicateCandidates: [{
          personId: 'person-1', otherPersonId: 'person-2',
          basis: 'legal-name-and-dob', evidence: 'same name and dob',
        }],
      })],
      OPTIONS,
    );
    assert.equal(pack.rows.length, 0);
    assert.equal(pack.excluded[0]?.reason, 'unresolved-duplicate');
    assert.match(pack.excluded[0]!.detail, /different child/);
  });

  it('excludes another club\'s registration — a pack is never cross-tenant', () => {
    const pack = buildSubmissionPack(
      [candidate({
        person: person({ clubId: 'club-other' }),
        registration: registration({ clubId: 'club-other' }),
      })],
      OPTIONS,
    );
    assert.equal(pack.rows.length, 0);
    assert.equal(pack.excluded[0]?.reason, 'wrong-club');
  });

  it('excludes a different season', () => {
    const pack = buildSubmissionPack(
      [candidate({ registration: registration({ seasonId: 'season-2025' }) })],
      OPTIONS,
    );
    assert.equal(pack.excluded[0]?.reason, 'wrong-season');
  });

  it('keeps good and bad candidates apart in one build', () => {
    const good = candidate();
    const bad = candidate({
      registration: registration({ id: 'r2', outstandingAmountCents: 5000 }),
      person: person({ id: 'person-2' }),
    });
    const pack = buildSubmissionPack([good, bad], OPTIONS);
    assert.equal(pack.rows.length, 1);
    assert.equal(pack.excluded.length, 1);
    assert.equal(pack.excluded[0]?.personId, 'person-2');
  });

  it('is frozen — correcting anything means a new version (BR58)', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    assert.equal(Object.isFrozen(pack), true);
    assert.equal(Object.isFrozen(pack.rows), true);
    assert.throws(() => {
      (pack as { version: number }).version = 2;
    }, TypeError);
  });

  it('records who generated it and when (BR58)', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    assert.equal(pack.generatedByUserId, 'user-registrar');
    assert.equal(pack.generatedAt, '2026-08-07T02:00:00Z');
    assert.equal(pack.version, 1);
  });
});

describe('photographs (BR56, BR59)', () => {
  const withPhoto = candidate({ person: person({ photoPath: 'photos/p1.jpg' }) });

  it('are omitted when the pack was not asked to carry them', () => {
    const pack = buildSubmissionPack([withPhoto], OPTIONS);
    assert.equal(pack.rows[0]?.photoPath, null);
    assert.equal(pack.includesPhotographs, false);
  });

  it('are omitted without a live photograph consent, even when asked for', () => {
    const pack = buildSubmissionPack([withPhoto], { ...OPTIONS, includePhotographs: true });
    assert.equal(pack.rows[0]?.photoPath, null);
  });

  it('travel only with both the option and the consent', () => {
    const consented = candidate({
      person: person({ photoPath: 'photos/p1.jpg' }),
      consents: [consent(), consent({ purpose: 'IDENTIFICATION_PHOTOGRAPH' })],
    });
    const pack = buildSubmissionPack([consented], { ...OPTIONS, includePhotographs: true });
    assert.equal(pack.rows[0]?.photoPath, 'photos/p1.jpg');
  });

  it('stop travelling once the consent is revoked', () => {
    const revoked = candidate({
      person: person({ photoPath: 'photos/p1.jpg' }),
      consents: [
        consent(),
        consent({ purpose: 'IDENTIFICATION_PHOTOGRAPH', revokedAt: '2026-07-01T00:00:00Z' }),
      ],
    });
    const pack = buildSubmissionPack([revoked], { ...OPTIONS, includePhotographs: true });
    assert.equal(pack.rows[0]?.photoPath, null);
  });
});

describe('handover and status (BR60)', () => {
  it('produces records in state "sent", never "confirmed"', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    const records = recordsForHandover(pack);
    assert.equal(records.length, 1);
    assert.equal(records[0]?.state, 'sent');
    assert.equal(records[0]?.submissionPackVersion, 1);
  });

  it('never marks a registration COMPLETE on handover', () => {
    for (const status of ['DRAFT', 'PENDING_DOCUMENTS', 'PENDING_PAYMENT'] as const) {
      assert.equal(statusAfterHandover(status), 'PENDING_EXTERNAL_REGISTRATION');
    }
  });

  it('completes only when the federation confirms the player is present', () => {
    assert.equal(
      statusAfterSubmissionOutcome('PENDING_EXTERNAL_REGISTRATION', 'confirmed_present'),
      'COMPLETE',
    );
    assert.equal(
      statusAfterSubmissionOutcome('PENDING_EXTERNAL_REGISTRATION', 'sent'),
      'PENDING_EXTERNAL_REGISTRATION',
    );
    assert.equal(
      statusAfterSubmissionOutcome('PENDING_EXTERNAL_REGISTRATION', 'rejected'),
      'PENDING_DOCUMENTS',
    );
  });

  it('does not make a submitted player eligible (BR43)', () => {
    assert.equal(isEligibleToPlay(statusAfterHandover('DRAFT')), false);
    assert.equal(isEligibleToPlay('COMPLETE'), true);
  });
});

describe('CSV', () => {
  it('writes the header in the documented column order', () => {
    const pack = buildSubmissionPack([candidate()], OPTIONS);
    const firstLine = packToCsv(pack).replace('﻿', '').split('\r\n')[0];
    assert.equal(firstLine, PACK_COLUMNS.join(','));
  });

  it('quotes names containing commas and quotes rather than corrupting them', () => {
    const awkward = candidate({
      person: person({
        legalName: { givenNames: 'Mary "Mae"', familyName: "O'Brien, Jr" },
        legalNameVerifiedAt: '2026-01-15T00:00:00Z',
      }),
    });
    const csv = packToCsv(buildSubmissionPack([awkward], OPTIONS));
    assert.match(csv, /"O'Brien, Jr"/);
    assert.match(csv, /"Mary ""Mae"""/);
  });

  it('starts with a BOM and uses CRLF, so non-ASCII names survive a spreadsheet', () => {
    const viet = candidate({
      person: person({ legalName: { givenNames: 'Nguyễn Văn', familyName: 'Trần' } }),
    });
    const csv = packToCsv(buildSubmissionPack([viet], OPTIONS));
    assert.equal(csv.startsWith('﻿'), true);
    assert.match(csv, /\r\n/);
    assert.match(csv, /Trần/);
  });

  it('writes an exclusion list the registrar can work from', () => {
    const pack = buildSubmissionPack(
      [candidate({ person: person({ legalNameVerifiedAt: null }) })],
      OPTIONS,
    );
    const csv = exclusionsToCsv(pack);
    assert.match(csv, /person-1/);
    assert.match(csv, /validation-failed/);
    assert.match(csv, /BR55/);
  });
});
