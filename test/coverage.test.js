import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { READ_TOOLS, TOOLS } from '../lib/gating.js';

test('every dispatchable switch tool is classified in READ_TOOLS or TOOLS', () => {
  const src = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const cases = [...src.matchAll(/case '(proxmox_[a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(cases.length > 40, `expected many tools, found ${cases.length}`);
  const classified = new Set([...READ_TOOLS, ...Object.keys(TOOLS)]);
  const unclassified = cases.filter((name) => !classified.has(name));
  assert.deepEqual(unclassified, [], `unclassified tools: ${unclassified.join(', ')}`);
});
