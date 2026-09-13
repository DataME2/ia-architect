import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { awaitingDecision, disposalWarning, groupReviews } from './privacy-view.ts';

const row = (personName: string, state: Parameters<typeof groupReviews>[0][number]['state']) =>
  ({ id: personName, personName, state, detail: null });

describe('groupReviews — only one group asks for a decision', () => {
  it('puts disposal proposals first', () => {
    const groups = groupReviews([
      row('Active Alice', 'active'),
      row('Life Lena', 'life_member'),
      row('Disposable Dan', 'due_for_disposal'),
    ]);
    assert.equal(groups[0]?.state, 'due_for_disposal');
  });

  it('marks only the disposal group actionable', () => {
    const groups = groupReviews([
      row('Dan', 'due_for_disposal'),
      row('Lena', 'life_member'),
      row('Stale Sam', 'contact_stale'),
    ]);
    // A life member appearing beside a disposal proposal with the same
    // affordance is how a club deletes its own history.
    assert.deepEqual(groups.map((g) => [g.state, g.actionable]), [
      ['due_for_disposal', true],
      ['contact_stale', false],
      ['life_member', false],
    ]);
  });

  it('sorts people within a group by name', () => {
    const groups = groupReviews([row('Zoe', 'lapsed'), row('Ana', 'lapsed')]);
    assert.deepEqual(groups[0]?.rows.map((r) => r.personName), ['Ana', 'Zoe']);
  });
});

describe('awaitingDecision — a refusal is an answer', () => {
  it('counts only the undecided', () => {
    assert.equal(awaitingDecision([
      { state: 'received' }, { state: 'refused' }, { state: 'honoured' }, { state: 'withdrawn' },
    ]), 1);
  });

  it('does not nag a club to re-decide a refusal', () => {
    assert.equal(awaitingDecision([{ state: 'refused' }, { state: 'refused' }]), 0);
  });
});

describe('disposalWarning', () => {
  it('says what goes and that it cannot be undone', () => {
    const words = disposalWarning('Piri Household');
    assert.match(words, /cannot be undone/);
    assert.match(words, /registrations, roles/);
  });
});
