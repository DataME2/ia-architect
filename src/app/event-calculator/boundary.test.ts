/**
 * BR222: the public event calculator reads no club's data and keeps
 * nothing — asserted, not just promised.
 *
 * Its only safety property is an absence: no server action, no route
 * handler, no Supabase client, no request and no storage behind the page.
 * The failure this catches is the plausible next edit — a "save this
 * estimate" button, a lookup of a club's real fees — which would quietly
 * turn a public page into one that reads or writes tenant data, the one
 * thing that let it be public without an exception to P5.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const DIR = new URL('./', import.meta.url);
const sources = readdirSync(DIR)
  .filter((f) => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.endsWith('.test.ts'))
  .map((f) => ({ file: f, text: readFileSync(new URL(f, DIR), 'utf8') }));

const ALLOWED = [/^react$/, /^next\/link$/, /^\.\/[\w-]+\.tsx?$/, /^\.\.\/\.\.\/domain\//, /^\.\.\/\.\.\/web\//];

test('the calculator imports only React, a link, the pure domain and the pure view layer', () => {
  assert.ok(sources.length >= 2, 'found the page and its component');
  for (const { file, text } of sources) {
    for (const [, spec] of text.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.ok(ALLOWED.some((re) => re.test(spec as string)), `${file} imports ${spec}`);
    }
  }
});

test('nothing behind it sends, stores or acts on the server', () => {
  for (const { file, text } of sources) {
    assert.doesNotMatch(text, /['"]use server['"]/, `${file} declares a server action`);
    assert.doesNotMatch(text, /\bfetch\s*\(/, `${file} makes a request`);
    assert.doesNotMatch(text, /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/, `${file} keeps something`);
    assert.doesNotMatch(text, /<form\b/, `${file} has a form that could submit`);
  }
});
