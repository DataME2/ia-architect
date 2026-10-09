import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { parseRegistrationForm } from './registration-form.ts';
import { WIZARD_STEPS, errorsForStep, firstStepWithError, reviewLines, stepOfField } from './registration-wizard.ts';

describe('the registration wizard — one form in steps', () => {
  it('owns every field the parser can complain about', () => {
    // An empty form makes the parser report the fields it requires; every one
    // must belong to a step, or the wizard could never show that error.
    const parsed = parseRegistrationForm({}, { today: '2026-10-09' });
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    for (const e of parsed.errors) {
      assert.ok(WIZARD_STEPS.some((s) => s.fields.includes(e.field)), `${e.field} has no step`);
    }
  });

  it('places a minor’s missing guardian on the guardian step', () => {
    const parsed = parseRegistrationForm(
      { legalGivenNames: 'Mia', legalFamilyName: 'Lee', dateOfBirth: '2016-05-01', consentCollectionNotice: 'on' },
      { today: '2026-10-09' },
    );
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(firstStepWithError(parsed.errors), 1);
    assert.equal(errorsForStep(parsed.errors, 0).length, 0);
  });

  it('opens the earliest step with an error, and none when clean', () => {
    assert.equal(firstStepWithError([{ field: 'consentCollectionNotice', message: 'x' }, { field: 'dateOfBirth', message: 'y' }]), 0);
    assert.equal(firstStepWithError([]), null);
    assert.equal(stepOfField('somethingNew'), 0);
  });

  it('reads back exactly what was typed, guardian only when given', () => {
    const adult = reviewLines({ legalGivenNames: 'Alexandra Marie', legalFamilyName: 'Ng', dateOfBirth: '1990-01-01', consentCollectionNotice: 'on' });
    assert.deepEqual(adult.slice(0, 1), [{ label: 'Legal name', value: 'Alexandra Marie Ng' }]);
    assert.ok(!adult.some((l) => l.label === 'Parent or guardian'));
    assert.equal(adult.find((l) => l.label === 'Collection notice read')!.value, 'Yes');
    const minor = reviewLines({ guardianGivenNames: 'Sam', guardianFamilyName: 'Ng' });
    assert.equal(minor.find((l) => l.label === 'Parent or guardian')!.value, 'Sam Ng');
  });
});
