import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProxmoxServer } from '../index.js';

function makeServer() {
  Object.assign(process.env, {
    PROXMOX_HOST: '10.0.0.1',
    PROXMOX_TOKEN_VALUE: 'x',
    PROTECTED_IDS: '100-115',
    MANAGED_RANGE: '400-499',
    ALLOW_PROVISION: 'false',
    ALLOW_POWER: 'false',
    ALLOW_SNAPSHOT: 'false',
    ALLOW_BACKUP: 'false',
    ALLOW_DESTROY: 'false',
  });
  return new ProxmoxServer();
}

test('getNextIdInRange returns first gap in range', async () => {
  const s = makeServer();
  s.proxmoxRequest = async () => [
    { vmid: 400 },
    { vmid: 401 },
    { vmid: 403 },
  ];
  const res = await s.getNextIdInRange(400, 499);
  assert.match(res.content[0].text, /402/);
});

test('getNextIdInRange reports full range', async () => {
  const s = makeServer();
  s.proxmoxRequest = async () => [{ vmid: 400 }, { vmid: 401 }];
  const res = await s.getNextIdInRange(400, 401);
  assert.match(res.content[0].text, /No free VMID/i);
});

test('callTool dispatches proxmox_get_next_id_in_range (gate allows read tool)', async () => {
  const s = makeServer();
  s.proxmoxRequest = async () => [{ vmid: 100 }, { vmid: 101 }, { vmid: 103 }];
  const res = await s.callTool('proxmox_get_next_id_in_range', { lo: 100, hi: 199 });
  assert.match(res.content[0].text, /102/);
});
