import assert from 'node:assert/strict';
import { test } from 'node:test';

import { sortedByRecency, stamp, unreadCount, type InboxNotification } from './inbox-view.ts';

const note = (over: Partial<InboxNotification> = {}): InboxNotification => ({
  id: 'n1',
  kind: 'officiating_interest_declared',
  headline: 'Someone would like to officiate',
  detail: null,
  linkPath: '/registrar/referees',
  createdAt: '2026-09-16T04:00:00Z',
  readAt: null,
  ...over,
});

test('unreadCount counts only what has no readAt', () => {
  assert.equal(unreadCount([note(), note({ id: 'n2', readAt: '2026-09-16T05:00:00Z' }), note({ id: 'n3' })]), 2);
});

test('unreadCount of an empty inbox is zero, not an error', () => {
  assert.equal(unreadCount([]), 0);
});

test('sortedByRecency puts the newest first', () => {
  const older = note({ id: 'old', createdAt: '2026-09-01T00:00:00Z' });
  const newer = note({ id: 'new', createdAt: '2026-09-16T00:00:00Z' });
  assert.deepEqual(sortedByRecency([older, newer]).map((n) => n.id), ['new', 'old']);
});

test('sortedByRecency does not mutate its input', () => {
  const list = [note({ id: 'a', createdAt: '2026-01-01T00:00:00Z' }), note({ id: 'b', createdAt: '2026-06-01T00:00:00Z' })];
  const original = [...list];
  sortedByRecency(list);
  assert.deepEqual(list, original);
});

test('stamp reads as a date and a time', () => {
  assert.equal(stamp('2026-09-16T14:32:07.123Z'), '2026-09-16 14:32');
});

test('stamp leaves a short or malformed value alone rather than guessing', () => {
  assert.equal(stamp('2026-09-16'), '2026-09-16');
});
