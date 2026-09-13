import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { RuleOutcome } from '../domain/rules/types.ts';
import type { Person } from '../domain/types.ts';
import { childCard, moneyLine, remainingFigure, selectChild } from './household-view.ts';

const person = (id = 'p1', dateOfBirth = '2015-06-01'): Person => ({
  id,
  clubId: 'club',
  legalName: { givenNames: 'Peter', familyName: 'Tavera' },
  legalNameVerifiedAt: null,
  preferredName: null,
  dateOfBirth,
  email: null,
  photoPath: null,
});

const missingBirthCertificate: RuleOutcome = { ruleId: 'BR2', status: 'fail', message: 'Still needed: BIRTH_CERTIFICATE.' };
const legalNameUnchecked: RuleOutcome = { ruleId: 'BR55', status: 'fail', message: 'Legal name not verified.' };

describe('childCard', () => {
  const today = '2026-09-13';

  it('says plainly when a child has no registration this season', () => {
    const card = childCard({ person: person(), status: null, outcomes: [], balanceCents: 0 }, today);
    assert.equal(card.tone, 'none');
    assert.equal(card.money, null);
  });

  it('shows a paid, COMPLETE registration as registered, ignoring the registrar checklist', () => {
    const card = childCard({ person: person(), status: 'COMPLETE', outcomes: [legalNameUnchecked], balanceCents: 0 }, today);
    assert.equal(card.tone, 'ok');
    assert.equal(card.blockers.length, 0);
  });

  it('never calls a child who owes money clear to play (BR79)', () => {
    const card = childCard({ person: person(), status: 'COMPLETE', outcomes: [], balanceCents: 6000 }, today);
    assert.equal(card.tone, 'stop');
  });

  it('counts what is outstanding on an unfinished registration', () => {
    const card = childCard(
      { person: person(), status: 'PENDING_DOCUMENTS', outcomes: [missingBirthCertificate], balanceCents: 0 },
      today,
    );
    assert.equal(card.tone, 'stop');
    assert.equal(card.label, '1 thing outstanding');
    assert.deepEqual(card.blockers, [missingBirthCertificate]);
  });

  it('is waiting, not blocked, once only the governing body is left', () => {
    const card = childCard({ person: person(), status: 'PENDING_EXTERNAL_REGISTRATION', outcomes: [], balanceCents: 0 }, today);
    assert.equal(card.tone, 'wait');
  });

  it('gives the age on the day', () => assert.equal(childCard({ person: person(), status: null, outcomes: [], balanceCents: 0 }, today).age, 11));
});

describe('money', () => {
  it('reads an overpayment as a credit, never a negative', () => {
    assert.match(moneyLine(-13500), /in credit$/);
    assert.doesNotMatch(moneyLine(-13500), /-/);
  });

  it('turns a negative remaining figure into a credit', () => {
    assert.deepEqual(remainingFigure(-13500), { label: 'Credit', cents: 13500 });
    assert.deepEqual(remainingFigure(2000), { label: 'Remaining', cents: 2000 });
  });
});

describe('selectChild', () => {
  const cards = [{ personId: 'a' }, { personId: 'b' }];
  it('honours the requested child', () => assert.equal(selectChild(cards, 'b')?.personId, 'b'));
  it('falls back to the first for an unknown or missing request', () => {
    assert.equal(selectChild(cards, 'someone-else')?.personId, 'a');
    assert.equal(selectChild(cards, null)?.personId, 'a');
  });
  it('is null with no children', () => assert.equal(selectChild([], 'a'), null));
});
