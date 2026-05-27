import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFreeId } from '../lib/nextid.js';

test('returns lowest free id within an inclusive range', () => {
  const used = new Set([100, 101, 103]);
  assert.equal(nextFreeId(used, 100, 199), 102);
});

test('skips to first gap when range start is taken', () => {
  const used = new Set([400, 401, 402]);
  assert.equal(nextFreeId(used, 400, 499), 403);
});

test('returns null when range is full', () => {
  const used = new Set([400, 401]);
  assert.equal(nextFreeId(used, 400, 401), null);
});
