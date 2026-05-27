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

test('suggestIp returns first free octet after scanning lxc and qemu configs', async () => {
  const s = makeServer();
  // Stub proxmoxRequest:
  //   GET /nodes/pve/lxc  -> [{vmid:400},{vmid:401}]
  //   GET /nodes/pve/lxc/400/config -> {net0:'name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1'}
  //   GET /nodes/pve/lxc/401/config -> {net0:'name=eth0,bridge=vmbr0,ip=dhcp'}
  //   GET /nodes/pve/qemu -> [{vmid:100}]
  //   GET /nodes/pve/qemu/100/config -> {net0:'name=eth0,bridge=vmbr0,ip=192.168.1.51/24,gw=192.168.1.1'}
  s.proxmoxRequest = async (endpoint) => {
    if (endpoint === '/nodes/pve/lxc') return [{ vmid: 400 }, { vmid: 401 }];
    if (endpoint === '/nodes/pve/lxc/400/config') return { net0: 'name=eth0,bridge=vmbr0,ip=192.168.1.50/24,gw=192.168.1.1' };
    if (endpoint === '/nodes/pve/lxc/401/config') return { net0: 'name=eth0,bridge=vmbr0,ip=dhcp' };
    if (endpoint === '/nodes/pve/qemu') return [{ vmid: 100 }];
    if (endpoint === '/nodes/pve/qemu/100/config') return { net0: 'name=eth0,bridge=vmbr0,ip=192.168.1.51/24,gw=192.168.1.1' };
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  };
  // octets 50 and 51 are used; next free starting at 50 should be 52
  const res = await s.suggestIp('pve', 50, 254);
  assert.match(res.content[0].text, /192\.168\.1\.52/);
  assert.match(res.content[0].text, /UniFi/);
});

test('suggestIp returns warning when range is exhausted', async () => {
  const s = makeServer();
  s.proxmoxRequest = async (endpoint) => {
    if (endpoint === '/nodes/pve/lxc') return [{ vmid: 400 }];
    if (endpoint === '/nodes/pve/lxc/400/config') return { net0: 'name=eth0,bridge=vmbr0,ip=192.168.1.10/24,gw=192.168.1.1' };
    if (endpoint === '/nodes/pve/qemu') return [];
    return {};
  };
  const res = await s.suggestIp('pve', 10, 10);
  assert.match(res.content[0].text, /No free IP/i);
});

test('callTool dispatches proxmox_suggest_ip (gate allows read tool)', async () => {
  const s = makeServer();
  s.proxmoxRequest = async (endpoint) => {
    if (endpoint === '/nodes/pve/lxc') return [];
    if (endpoint === '/nodes/pve/qemu') return [];
    return {};
  };
  const res = await s.callTool('proxmox_suggest_ip', { node: 'pve', start: 100, end: 200 });
  assert.match(res.content[0].text, /192\.168\.1\.100/);
});
