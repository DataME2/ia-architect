import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { Person } from '../domain/types.ts';
import { birthDateLabel, playerRecordLines } from './player-record-view.ts';

const sebastian: Person = {
  id: 'p1',
  clubId: 'club',
  legalName: { givenNames: 'Sebastian', familyName: 'Suarez Alfonso' },
  legalNameVerifiedAt: null,
  preferredName: 'Seba',
  dateOfBirth: '2014-03-09',
  email: null,
  photoPath: null,
};

const value = (lines: ReturnType<typeof playerRecordLines>, label: string) =>
  lines.find((l) => l.label === label)?.value;

describe('playerRecordLines', () => {
  it('shows the legal name even when a preferred name exists — a correction to it is visible', () => {
    const lines = playerRecordLines(sebastian, null);
    assert.match(value(lines, 'Legal name') ?? '', /^Sebastian Suarez Alfonso/);
    assert.equal(value(lines, 'Known as'), 'Seba');
  });

  it('says when the legal name has not been checked (BR55)', () => {
    assert.match(value(playerRecordLines(sebastian, null), 'Legal name') ?? '', /not yet checked/);
    const checked = { ...sebastian, legalNameVerifiedAt: '2026-09-01T00:00:00Z' };
    assert.equal(value(playerRecordLines(checked, null), 'Legal name'), 'Sebastian Suarez Alfonso');
  });

  it('shows the confirmed profile in words', () => {
    const lines = playerRecordLines(sebastian, {
      preferredPosition: 'midfielder',
      secondaryPosition: null,
      preferredFoot: 'left',
      squadNumber: 8,
    });
    assert.equal(value(lines, 'Preferred position'), 'Midfielder');
    assert.equal(value(lines, 'Also plays'), 'Not recorded');
    assert.equal(value(lines, 'Preferred foot'), 'Left');
    assert.equal(value(lines, 'Squad number'), '8');
  });

  it('reads absence as absence rather than dropping the line', () => {
    const lines = playerRecordLines(sebastian, null);
    assert.equal(value(lines, 'Squad number'), 'Not recorded');
    assert.equal(value(lines, 'Email'), 'Not recorded');
    assert.equal(lines.length, 8);
  });

  it('never carries height or weight (BR99)', () => {
    const labels = playerRecordLines(sebastian, null).map((l) => l.label.toLowerCase());
    assert.ok(!labels.some((l) => l.includes('height') || l.includes('weight')));
  });
});

describe('birthDateLabel', () => {
  it('keeps the year', () => assert.equal(birthDateLabel('2014-03-09'), '9 Mar 2014'));
  it('returns what it cannot read unchanged', () => assert.equal(birthDateLabel('soon'), 'soon'));
});
