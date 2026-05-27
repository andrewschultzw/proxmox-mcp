import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProxmoxServer } from '../index.js';

function makeServer(env) {
  Object.assign(process.env, {
    PROXMOX_HOST: '10.0.0.1',
    PROXMOX_TOKEN_VALUE: 'x',
    PROTECTED_IDS: '100-115,200,205,300-302',
    MANAGED_RANGE: '400-499',
    ALLOW_PROVISION: 'true',
    ALLOW_POWER: 'true',
    ALLOW_SNAPSHOT: 'true',
    ALLOW_BACKUP: 'true',
    ALLOW_DESTROY: 'false',
  }, env);
  return new ProxmoxServer();
}

test('gate builds from env into this.gate', () => {
  const s = makeServer();
  assert.equal(s.gate.categories.provision, true);
  assert.equal(s.gate.categories.destroy, false);
  assert.equal(s.gate.protectedIds.has(107), true);
});

test('callTool refuses a stop on a protected id without hitting the API', async () => {
  const s = makeServer();
  let called = false;
  s.proxmoxRequest = async () => { called = true; return {}; };
  const res = await s.callTool('proxmox_stop_lxc', { node: 'pve', vmid: '107' });
  assert.equal(called, false);
  assert.match(res.content[0].text, /protected/i);
});

test('callTool allows a stop on a managed-range id (reaches the API stub)', async () => {
  const s = makeServer();
  let called = false;
  s.proxmoxRequest = async () => { called = true; return { data: 'UPID:...' }; };
  await s.callTool('proxmox_stop_lxc', { node: 'pve', vmid: '450' });
  assert.equal(called, true);
});
