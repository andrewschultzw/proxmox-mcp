import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorize, TOOLS, READ_TOOLS } from '../lib/gating.js';
import { parseIdSpec } from '../lib/idspec.js';

const cfg = {
  categories: { provision: true, power: true, snapshot: true, backup: true, destroy: false },
  protectedIds: parseIdSpec('100-115,200,205,300-302'),
};

// ─── read tools ──────────────────────────────────────────────────────────────

test('read tools are always allowed', () => {
  assert.equal(authorize('proxmox_get_nodes', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_node_status', { node: 'pve' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_vms', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_vm_status', { node: 'pve', vmid: '200' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_storage', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_cluster_status', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_next_vmid', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_list_templates', { node: 'pve' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_list_snapshots_lxc', { node: 'pve', vmid: '200' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_list_snapshots_vm', { node: 'pve', vmid: '200' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_list_backups', { node: 'pve' }, cfg).allowed, true);
  // pre-listed future read tools
  assert.equal(authorize('proxmox_export_inventory', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_get_next_id_in_range', {}, cfg).allowed, true);
  assert.equal(authorize('proxmox_suggest_ip', {}, cfg).allowed, true);
});

// ─── disabled category ───────────────────────────────────────────────────────

test('disabled category is refused with a reason', () => {
  const d = authorize('proxmox_delete_lxc', { vmid: '450', confirm: true }, cfg);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /destroy/i);
});

test('disabled category is refused for all destroy variants', () => {
  assert.equal(authorize('proxmox_delete_vm', { vmid: '450', confirm: true }, cfg).allowed, false);
});

// ─── harmful op on protected id ──────────────────────────────────────────────

test('harmful op on a protected id is refused', () => {
  const d = authorize('proxmox_stop_lxc', { vmid: '107' }, cfg);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /protected/i);
});

test('harmful op on a protected id is refused — vm variants', () => {
  assert.equal(authorize('proxmox_stop_vm', { vmid: '200' }, cfg).allowed, false);
  assert.equal(authorize('proxmox_reboot_vm', { vmid: '205' }, cfg).allowed, false);
  assert.equal(authorize('proxmox_shutdown_lxc', { vmid: '100' }, cfg).allowed, false);
  assert.equal(authorize('proxmox_pause_vm', { vmid: '300' }, cfg).allowed, false);
});

// ─── harmful op on non-protected id ─────────────────────────────────────────

test('harmful op on a non-protected id is allowed', () => {
  assert.equal(authorize('proxmox_stop_lxc', { vmid: '450' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_stop_vm', { vmid: '450' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_pause_vm', { vmid: '450' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_resize_lxc', { vmid: '450' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_resize_vm', { vmid: '450' }, cfg).allowed, true);
});

// ─── snapshot/backup protective ops on protected ids ─────────────────────────

test('snapshot/backup of a protected id IS allowed (protective, not harmful)', () => {
  // create_snapshot_* and create_backup_* have harmsTarget:false
  assert.equal(authorize('proxmox_create_snapshot_lxc', { vmid: '107', snapname: 's1' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_create_snapshot_vm',  { vmid: '107', snapname: 's1' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_create_backup_lxc',   { vmid: '107' }, cfg).allowed, true);
  assert.equal(authorize('proxmox_create_backup_vm',    { vmid: '107' }, cfg).allowed, true);
});

// ─── irreversible ops require confirm=true ───────────────────────────────────

test('irreversible op requires confirm=true', () => {
  const enabled = { ...cfg, categories: { ...cfg.categories, destroy: true } };

  // delete_lxc
  const noConfirm = authorize('proxmox_delete_lxc', { vmid: '450' }, enabled);
  assert.equal(noConfirm.allowed, false);
  assert.equal(noConfirm.needsConfirm, true);
  const confirmed = authorize('proxmox_delete_lxc', { vmid: '450', confirm: true }, enabled);
  assert.equal(confirmed.allowed, true);

  // delete_vm
  assert.equal(authorize('proxmox_delete_vm', { vmid: '450' }, enabled).allowed, false);
  assert.equal(authorize('proxmox_delete_vm', { vmid: '450', confirm: true }, enabled).allowed, true);

  // rollback_snapshot_lxc / _vm
  assert.equal(authorize('proxmox_rollback_snapshot_lxc', { vmid: '450', snapname: 's1' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_rollback_snapshot_vm',  { vmid: '450', snapname: 's1' }, cfg).needsConfirm, true);

  // delete_snapshot_lxc / _vm
  assert.equal(authorize('proxmox_delete_snapshot_lxc', { vmid: '450', snapname: 's1' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_delete_snapshot_vm',  { vmid: '450', snapname: 's1' }, cfg).needsConfirm, true);

  // restore_backup_*
  assert.equal(authorize('proxmox_restore_backup_lxc', { vmid: '450', archive: 'a' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_restore_backup_vm',  { vmid: '450', archive: 'a' }, cfg).needsConfirm, true);

  // delete_backup (no vmid required, harmsTarget:false)
  assert.equal(authorize('proxmox_delete_backup', { node: 'pve', storage: 'local', volume: 'v' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_delete_backup', { node: 'pve', storage: 'local', volume: 'v', confirm: true }, cfg).allowed, true);

  // remove_disk_vm / remove_mountpoint_lxc / remove_network_*
  assert.equal(authorize('proxmox_remove_disk_vm',      { vmid: '450', disk: 'scsi1' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_remove_mountpoint_lxc', { vmid: '450', mp: 'mp0' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_remove_network_vm',   { vmid: '450', net: 'net1' }, cfg).needsConfirm, true);
  assert.equal(authorize('proxmox_remove_network_lxc',  { vmid: '450', net: 'net1' }, cfg).needsConfirm, true);
});

// ─── missing/invalid vmid ────────────────────────────────────────────────────

test('harmful op with missing/invalid vmid is refused', () => {
  assert.equal(authorize('proxmox_stop_lxc', {}, cfg).allowed, false);
  assert.equal(authorize('proxmox_delete_lxc', { confirm: true }, { ...cfg, categories: { ...cfg.categories, destroy: true } }).allowed, false);
  // empty-string vmid must not resolve to 0 and slip through
  assert.equal(authorize('proxmox_stop_lxc', { vmid: '' }, cfg).allowed, false);
  // non-numeric vmid
  assert.equal(authorize('proxmox_stop_lxc', { vmid: 'bad' }, cfg).allowed, false);
  // vmid 0 is invalid
  assert.equal(authorize('proxmox_stop_lxc', { vmid: '0' }, cfg).allowed, false);
});

// ─── fail-closed: unknown/unclassified tools are DENIED ──────────────────────

test('unknown tool is denied (fail-closed)', () => {
  const d = authorize('proxmox_execute_vm_command', { vmid: '450' }, cfg);
  assert.equal(d.allowed, false);
  assert.match(d.reason, /not permitted/i);
});

test('arbitrary unknown tool name is denied', () => {
  assert.equal(authorize('proxmox_future_dangerous_op', { vmid: '450' }, cfg).allowed, false);
  assert.equal(authorize('proxmox_nuke_cluster', {}, cfg).allowed, false);
  assert.equal(authorize('anything_else', {}, cfg).allowed, false);
});

// ─── schema integrity ─────────────────────────────────────────────────────────

test('every mutating tool in TOOLS has a known category', () => {
  const validCategories = new Set(['provision', 'power', 'snapshot', 'backup', 'destroy']);
  for (const [name, meta] of Object.entries(TOOLS)) {
    assert.ok(validCategories.has(meta.category), `${name} has bad category '${meta.category}'`);
    assert.equal(typeof meta.harmsTarget, 'boolean', `${name}.harmsTarget must be boolean`);
    assert.equal(typeof meta.irreversible, 'boolean', `${name}.irreversible must be boolean`);
  }
});

test('no tool appears in both READ_TOOLS and TOOLS', () => {
  for (const name of READ_TOOLS) {
    assert.equal(TOOLS[name], undefined, `'${name}' is in both READ_TOOLS and TOOLS`);
  }
});

// ─── disk/network/mountpoint day-2 ops are gated (not silently read-allowed) ─

test('add/resize/move disk ops require power category enabled', () => {
  const noPower = { ...cfg, categories: { ...cfg.categories, power: false } };
  assert.equal(authorize('proxmox_add_disk_vm',    { vmid: '450', disk: 'scsi1', storage: 's', size: '10' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_resize_disk_vm', { vmid: '450', disk: 'scsi0', size: '+10G' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_resize_disk_lxc',{ vmid: '450', disk: 'rootfs', size: '+10G' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_move_disk_vm',   { vmid: '450', disk: 'scsi0', storage: 's' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_move_disk_lxc',  { vmid: '450', disk: 'rootfs', storage: 's' }, noPower).allowed, false);
});

test('network/mountpoint ops require power category enabled', () => {
  const noPower = { ...cfg, categories: { ...cfg.categories, power: false } };
  assert.equal(authorize('proxmox_add_network_vm',     { vmid: '450', net: 'net1', bridge: 'vmbr0' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_add_network_lxc',    { vmid: '450', net: 'net1', bridge: 'vmbr0' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_update_network_vm',  { vmid: '450', net: 'net0' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_update_network_lxc', { vmid: '450', net: 'net0' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_add_mountpoint_lxc', { vmid: '450', mp: 'mp0', storage: 's', size: '10' }, noPower).allowed, false);
});

test('pause_vm and resume_vm are gated by power category', () => {
  const noPower = { ...cfg, categories: { ...cfg.categories, power: false } };
  assert.equal(authorize('proxmox_pause_vm',  { vmid: '450' }, noPower).allowed, false);
  assert.equal(authorize('proxmox_resume_vm', { vmid: '450' }, noPower).allowed, false);
});
