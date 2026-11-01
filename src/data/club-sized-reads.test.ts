import assert from 'node:assert/strict';
import { test } from 'node:test';

import { QueryError, selectAll, selectIn } from './queries.ts';

const rows = (n: number, from = 0) => Array.from({ length: n }, (_, i) => ({ n: from + i }));

test('reads a club-sized table past Supabase’s 1,000-row cap', async (t) => {
  await t.test('pages until a page comes back short', async () => {
    const asked: [number, number][] = [];
    const all = await selectAll('person', async (from, to) => {
      asked.push([from, to]);
      return { data: rows(from < 2000 ? 1000 : 3, from), error: null };
    });
    assert.equal(all.length, 2003);
    assert.deepEqual(asked, [[0, 999], [1000, 1999], [2000, 2999]]);
  });

  await t.test('names the table when a page fails', async () => {
    await assert.rejects(
      selectAll('person', async () => ({ data: null, error: { message: 'boom' } })),
      (e: unknown) => e instanceof QueryError && e.message === 'person: boom',
    );
  });
});

test('takes a season’s ids a slice at a time, so no URL outgrows the gateway', async (t) => {
  await t.test('800 ids are eight requests of 100, the rows joined in order', async () => {
    const ids = Array.from({ length: 800 }, (_, i) => `id-${i}`);
    const slices: string[][] = [];
    const all = await selectIn('registration_document', ids, async (slice) => {
      slices.push(slice);
      return { data: slice.map((id) => ({ id })), error: null };
    });
    assert.equal(slices.length, 8);
    assert.ok(slices.every((s) => s.length === 100));
    assert.deepEqual(all.map((r) => r.id), ids);
  });

  await t.test('each slice is paged too', async () => {
    const all = await selectIn('team_member', ['a'], async (_slice, from) =>
      ({ data: rows(from === 0 ? 1000 : 5, from), error: null }));
    assert.equal(all.length, 1005);
  });

  await t.test('no ids, no request', async () => {
    let called = false;
    const all = await selectIn('consent', [], async () => {
      called = true;
      return { data: [], error: null };
    });
    assert.deepEqual(all, []);
    assert.equal(called, false);
  });
});
