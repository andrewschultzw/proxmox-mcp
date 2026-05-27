import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, TOOLS } from '../lib/gating.js';
import { parseIdSpec } from '../lib/idspec.js';

const cfg = {
  categories: { provision: true, power: true, snapshot: true, backup: true, destroy: false },
  protectedIds: parseIdSpec('100-115,200,205,300-302'),
};

test('read tools are always allowed', () => {
  assert.equal(authorize('proxmox_get_nodes', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_export_inventory', {}, cfg).allowed, true);
});

test('disabled category is refused with a reason', () => {
  const d = authorize('proxmox_delete_lxc', { vmid: '450', confirm: true }, cfg);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /destroy/i);
});

test('harmful op on a protected id is refused', () => {
  const d = authorize('proxmox_stop_lxc', { vmid: '107' }, cfg);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /protected/i);
});

test('harmful op on a non-protected id is allowed', () => {
  assert.equal(authorize('proxmox_stop_lxc', { vmid: '450' }, cfg).allowed, true);
});

test('snapshot/backup of a protected id IS allowed (protective, not harmful)', () => {
  assert.equal(authorize('proxmox_create_snapshot', { vmid: '107' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_create_backup', { vmid: '107' }, cfg).allowed, true);
});

test('irreversible op requires confirm=true', () => {
  const enabled = { ...cfg, categories: { ...cfg.categories, destroy: true } };
  const noConfirm = authorize('proxmox_delete_lxc', { vmid: '450' }, enabled);
  assert.equal(noConfirm.allowed, false);
  assert.equal(noConfirm.needsConfirm, true);
  const confirmed = authorize('proxmox_delete_lxc', { vmid: '450', confirm: true }, enabled);
  assert.equal(confirmed.allowed, true);
});

test('every mutating tool name in TOOLS has a known category', () => {
  const valid = new Set(['read', 'provision', 'power', 'snapshot', 'backup', 'destroy']);
  for (const [name, meta] of Object.entries(TOOLS)) {
    assert.ok(valid.has(meta.category), `${name} has bad category ${meta.category}`);
  }
});
