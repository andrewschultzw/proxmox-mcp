import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ramPreflight } from '../lib/preflight.js';

test('ok when request fits within free memory minus headroom', () => {
  const r = ramPreflight({ requestMB: 512, freeBytes: 4 * 1024 ** 3 });
  assert.equal(r.ok, true);
});

test('blocks when request exceeds free memory', () => {
  const r = ramPreflight({ requestMB: 8192, freeBytes: 2 * 1024 ** 3 });
  assert.equal(r.ok, false);
  assert.match(r.message, /exceeds/i);
});

test('respects headroom (default 512MB reserved)', () => {
  const r = ramPreflight({ requestMB: 600, freeBytes: 1024 * 1024 ** 2 });
  assert.equal(r.ok, false);
});
