import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIdSpec, isProtected, inManagedRange } from '../lib/idspec.js';

test('parseIdSpec expands ranges and singles into a Set of numbers', () => {
  const s = parseIdSpec('100-103,200,300-302');
  assert.deepEqual([...s].sort((a, b) => a - b), [100, 101, 102, 103, 200, 300, 301, 302]);
});

test('parseIdSpec returns empty Set for empty/undefined', () => {
  assert.equal(parseIdSpec('').size, 0);
  assert.equal(parseIdSpec(undefined).size, 0);
});

test('parseIdSpec tolerates whitespace', () => {
  assert.deepEqual([...parseIdSpec(' 100 , 200-201 ')], [100, 200, 201]);
});

test('isProtected checks membership', () => {
  const s = parseIdSpec('100-115,200,205,300-302');
  assert.equal(isProtected(s, 107), true);
  assert.equal(isProtected(s, 400), false);
  assert.equal(isProtected(s, '107'), true); // string coercion
});

test('inManagedRange checks inclusive bounds', () => {
  assert.equal(inManagedRange(400, 499, 450), true);
  assert.equal(inManagedRange(400, 499, 400), true);
  assert.equal(inManagedRange(400, 499, 499), true);
  assert.equal(inManagedRange(400, 499, 500), false);
});
