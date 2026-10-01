import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  availabilityItem,
  claimItem,
  correctionItem,
  designationItem,
  matchItem,
  workspacePath,
} from './waiting.ts';

// What 0067 accepts as a link: an in-app path, nothing else.
const IN_APP = /^\/[A-Za-z0-9_?&=./%-]*$/;

describe('workspacePath', () => {
  it("sends a child's item to that child's tab", () => {
    assert.equal(
      workspacePath('club-1', 'guardian', { self: false, childId: 'kid-1' }),
      '/me?role=guardian&club=club-1&child=kid-1',
    );
  });

  it("sends the account's own item to its own role", () => {
    assert.equal(workspacePath('club-1', 'referee', { self: true }), '/me?role=referee&club=club-1');
  });
});

describe('the five waiting items', () => {
  const fixture = { fixtureId: 'fx-1', personId: 'kid-1', opponent: 'Robina', playedOn: '2026-09-19' };

  it('keys an item by what is waiting, so it arrives once', () => {
    assert.equal(matchItem('c', { ...fixture, officialName: 'Sebastian' }).subjectKey, 'fx-1:kid-1');
    assert.equal(
      availabilityItem('c', { ...fixture, name: 'Sebastian' }, { self: false, childId: 'kid-1' }).subjectKey,
      'fx-1:kid-1',
    );
  });

  it("words a child's availability for the guardian, and the adult's own for themselves", () => {
    assert.equal(
      availabilityItem('c', { ...fixture, name: 'Sebastian' }, { self: false, childId: 'kid-1' }).headline,
      'Is Sebastian available against Robina on 2026-09-19?',
    );
    assert.equal(
      availabilityItem('c', { ...fixture, name: 'Ana' }, { self: true }).headline,
      'Are you available against Robina on 2026-09-19?',
    );
  });

  it('names the role a designation offers', () => {
    const d = { appointmentId: 'ap-1', officialName: 'Sebastian', role: 'referee', opponent: 'Robina', playedOn: '2026-09-19' };
    assert.equal(designationItem('c', d, { self: false, childId: 'kid-1' }).headline, 'Sebastian is offered as referee against Robina on 2026-09-19');
    assert.equal(designationItem('c', d, { self: true }).headline, 'You are offered as referee against Robina on 2026-09-19');
  });

  it('states the amount a claim is owed', () => {
    const item = claimItem('c', { claimId: 'cl-1', personId: 'kid-1', officialName: 'Sebastian', opponent: 'Robina', playedOn: '2026-09-19', amountCents: 3000 });
    assert.match(item.headline, /Sebastian is owed \$30\.00 for Robina on 2026-09-19/);
    assert.equal(item.subjectKey, 'cl-1');
  });

  it("sends a proposed correction to the player's record on the club screens", () => {
    const item = correctionItem('c', { correctionId: 'co-1', registrationId: 'reg-1', playerName: 'Ana Player' });
    assert.equal(item.linkPath, '/registrar/players/reg-1');
    assert.equal(item.headline, 'Ana Player proposed a correction to their record');
  });

  it('only ever links inside the app, as 0067 requires', () => {
    const uuid = '6f7515ce-fc87-43da-91bd-95310a6c0ac3';
    const items = [
      correctionItem(uuid, { correctionId: uuid, registrationId: uuid, playerName: 'A' }),
      availabilityItem(uuid, { fixtureId: uuid, personId: uuid, name: 'A', opponent: 'B', playedOn: '2026-01-01' }, { self: false, childId: uuid }),
      designationItem(uuid, { appointmentId: uuid, officialName: 'A', role: 'referee', opponent: 'B', playedOn: '2026-01-01' }, { self: true }),
      matchItem(uuid, { fixtureId: uuid, personId: uuid, officialName: 'A', opponent: 'B', playedOn: '2026-01-01' }),
      claimItem(uuid, { claimId: uuid, personId: uuid, officialName: 'A', opponent: 'B', playedOn: '2026-01-01', amountCents: 1 }),
    ];
    for (const item of items) assert.match(item.linkPath, IN_APP, item.kind);
  });
});
