import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatInventoryMarkdown, buildInventoryRows } from '../lib/inventory.js';

const resources = [
  { vmid: 107, name: 'paperless', type: 'lxc', status: 'running', maxmem: 1073741824, maxdisk: 8589934592 },
  { vmid: 450, name: 'k3s-cp-01', type: 'qemu', status: 'stopped', maxmem: 4294967296, maxdisk: 21474836480 },
];
const configs = { 107: { net0: 'name=eth0,ip=192.168.1.32/24' }, 450: { net0: 'ip=192.168.1.50/24' } };

test('buildInventoryRows merges resources with ip from config', () => {
  const rows = buildInventoryRows(resources, configs);
  assert.equal(rows[0].ip, '192.168.1.32');
  assert.equal(rows[0].id, 107);
  assert.equal(rows[1].ip, '192.168.1.50');
});

test('formatInventoryMarkdown renders a table with the ids', () => {
  const md = formatInventoryMarkdown(buildInventoryRows(resources, configs));
  assert.match(md, /\| 107 \|/);
  assert.match(md, /paperless/);
});
