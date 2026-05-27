import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProxmoxServer } from '../index.js';

test('create_lxc includes ssh-public-keys from CT300_SSH_PUBKEY env', async () => {
  Object.assign(process.env, {
    PROXMOX_HOST: '10.0.0.1', PROXMOX_TOKEN_VALUE: 'x',
    ALLOW_PROVISION: 'true', PROTECTED_IDS: '100', MANAGED_RANGE: '400-499',
    CT300_SSH_PUBKEY: 'ssh-ed25519 AAAAtestkey claude@ct300',
  });
  const s = new ProxmoxServer();
  const captured = [];
  s.proxmoxRequest = async (endpoint, method, body) => {
    captured.push({ endpoint, method, body });
    if (endpoint.endsWith('/status')) return { memory: { free: 8 * 1024 ** 3 } };
    return 'UPID:ok';
  };
  await s.callTool('proxmox_create_lxc', {
    node: 'pve', vmid: '450', ostemplate: 'local:vztmpl/debian-12.tar.zst', hostname: 'test',
  });
  const createCall = captured.find((c) => c.method === 'POST' && c.endpoint.includes('/lxc'));
  assert.ok(createCall, 'expected an LXC create POST');
  assert.equal(createCall.body['ssh-public-keys'], 'ssh-ed25519 AAAAtestkey claude@ct300');
});
