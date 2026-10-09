import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buildHome, roleHref, whereAnswered } from './home-view.ts';
import type { InboxNotification } from './inbox-view.ts';
import type { RoleHolding } from './role-context.ts';

const NORTH = '11111111-1111-1111-1111-111111111111';

const holding = (key: RoleHolding['key'], pending = 0): RoleHolding => ({
  key,
  clubId: NORTH,
  clubName: 'North Star FC',
  scope: null,
  pending,
});

const note = (id: string, kind: string, linkPath: string | null, createdAt = '2026-10-01T09:00:00Z'): InboxNotification => ({
  id,
  kind,
  headline: `headline ${id}`,
  detail: null,
  linkPath,
  createdAt,
  readAt: null,
});

describe('whereAnswered — the role and club an item is answered in', () => {
  it('reads a role context link', () =>
    assert.deepEqual(whereAnswered(`/me?role=referee&club=${NORTH}`), { role: 'referee', clubId: NORTH }));
  it('keeps the child parameter out of the way', () =>
    assert.deepEqual(whereAnswered(`/me?role=guardian&club=${NORTH}&child=abc`), { role: 'guardian', clubId: NORTH }));
  it('calls a club screen club administration', () =>
    assert.deepEqual(whereAnswered('/registrar/players/r1'), { role: null, clubId: null }));
  it('refuses a role that does not exist', () =>
    assert.equal(whereAnswered(`/me?role=admin&club=${NORTH}`).role, null));
});

describe('buildHome — BR61 and BR159', () => {
  it('lists only waiting kinds; announcements stay in the bell', () => {
    const home = buildHome([holding('referee')], [
      note('a', 'designation_unanswered', roleHref('referee', NORTH)),
      note('b', 'committee_confirmation', '/registrar/governance'),
    ]);
    assert.deepEqual(home.items.map((i) => i.id), ['a']);
  });

  it('puts an offered appointment before a payment nomination, and the older first', () => {
    const home = buildHome([holding('referee')], [
      note('claim', 'claim_unsettled', roleHref('referee', NORTH), '2026-09-01T00:00:00Z'),
      note('late', 'designation_unanswered', roleHref('referee', NORTH), '2026-10-02T00:00:00Z'),
      note('early', 'designation_unanswered', roleHref('referee', NORTH), '2026-10-01T00:00:00Z'),
    ]);
    assert.deepEqual(home.items.map((i) => i.id), ['early', 'late', 'claim']);
  });

  it('turns a guardian’s incomplete registrations and an overdue AGM into items', () => {
    const home = buildHome([holding('guardian', 2), holding('committee', 1)], []);
    assert.deepEqual(home.items.map((i) => [i.id, i.tone]), [
      [`agm:${NORTH}`, 'blocked'],
      [`registration:${NORTH}`, 'pending'],
    ]);
    assert.match(home.items[1]!.headline, /^2 registrations/);
  });

  it('counts each role’s items on its card, and names the club', () => {
    const home = buildHome([holding('player'), holding('referee')], [
      note('a', 'availability_unanswered', roleHref('player', NORTH)),
      note('b', 'designation_unanswered', roleHref('referee', NORTH)),
      note('c', 'match_unconfirmed', roleHref('referee', NORTH)),
    ]);
    assert.deepEqual(home.roles.map((r) => [r.key, r.waiting]), [['player', 1], ['referee', 2]]);
    assert.equal(home.items[0]!.clubName, 'North Star FC');
    assert.equal(home.roles[1]!.href, roleHref('referee', NORTH));
  });

  it('files a correction under club administration, on no role card', () => {
    const home = buildHome([holding('coach')], [note('x', 'correction_proposed', '/registrar/players/r1')]);
    assert.equal(home.items[0]!.roleLabel, 'Club administration');
    assert.equal(home.roles[0]!.waiting, 0);
  });

  it('is empty when nothing waits', () => assert.deepEqual(buildHome([holding('player')], []).items, []));
});
