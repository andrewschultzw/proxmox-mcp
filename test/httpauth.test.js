import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorized } from '../lib/httpauth.js';

const TOKEN = 'super-secret-token-value';

test('accepts a correct Bearer token', () => {
  assert.equal(isAuthorized(`Bearer ${TOKEN}`, TOKEN), true);
});

test('rejects missing header', () => {
  assert.equal(isAuthorized(undefined, TOKEN), false);
  assert.equal(isAuthorized('', TOKEN), false);
});

test('rejects wrong token and wrong scheme', () => {
  assert.equal(isAuthorized('Bearer nope', TOKEN), false);
  assert.equal(isAuthorized(TOKEN, TOKEN), false);
  assert.equal(isAuthorized(`Basic ${TOKEN}`, TOKEN), false);
});

test('rejects when no expected token configured', () => {
  assert.equal(isAuthorized(`Bearer ${TOKEN}`, ''), false);
  assert.equal(isAuthorized(`Bearer ${TOKEN}`, undefined), false);
});

test('rejects a token that is a prefix of the expected (length mismatch)', () => {
  assert.equal(isAuthorized(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN), false);
});
