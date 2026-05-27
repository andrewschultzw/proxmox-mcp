import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ipFromNetConfig, nextFreeIp } from '../lib/ip.js';

test('ipFromNetConfig extracts the host octet from a net0 string', () => {
  assert.equal(ipFromNetConfig('name=eth0,bridge=vmbr0,ip=192.168.1.123/24,gw=192.168.1.1'), 123);
  assert.equal(ipFromNetConfig('name=eth0,bridge=vmbr0,ip=dhcp'), null);
  assert.equal(ipFromNetConfig(undefined), null);
});

test('nextFreeIp returns lowest free host octet in [start,end] skipping used', () => {
  assert.equal(nextFreeIp(new Set([10, 11, 123]), 10, 254), 12);
});

test('nextFreeIp returns null when exhausted', () => {
  assert.equal(nextFreeIp(new Set([10, 11]), 10, 11), null);
});
