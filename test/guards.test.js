import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasBindMounts } from '../lib/guards.js';

test('detects mp0..mpN entries in an LXC config object', () => {
  assert.equal(hasBindMounts({ rootfs: 'local:8', mp0: '/mnt/data,mp=/data' }), true);
  assert.equal(hasBindMounts({ rootfs: 'local:8', mp3: '/x,mp=/x' }), true);
});

test('returns false when there are no mp entries', () => {
  assert.equal(hasBindMounts({ rootfs: 'local:8', net0: 'name=eth0' }), false);
  assert.equal(hasBindMounts({}), false);
});
