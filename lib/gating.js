import { isProtected } from './idspec.js';

// Read-only tools: always allowed, no category flag required.
// Pre-listed future tools (export_inventory, get_next_id_in_range, suggest_ip)
// are included here so adding them later requires no gating change.
export const READ_TOOLS = new Set([
  'proxmox_get_nodes',
  'proxmox_get_node_status',
  'proxmox_get_vms',
  'proxmox_get_vm_status',
  'proxmox_get_storage',
  'proxmox_get_cluster_status',
  'proxmox_get_next_vmid',
  'proxmox_list_templates',
  'proxmox_list_snapshots_lxc',
  'proxmox_list_snapshots_vm',
  'proxmox_list_backups',
  // Pre-listed for future tasks — safe to have here now
  'proxmox_export_inventory',
  'proxmox_get_next_id_in_range',
  'proxmox_suggest_ip',
]);

// Mutating tools with explicit category, harmsTarget, and irreversible flags.
// category drives the ALLOW_<CATEGORY>=true env-flag check.
// harmsTarget=true → refused when vmid is missing/invalid or in PROTECTED_IDS.
// irreversible=true → requires confirm=true to proceed.
//
// Tools NOT listed here AND not in READ_TOOLS are DENIED by default (fail-closed).
export const TOOLS = {
  // --- provision ---
  proxmox_create_lxc:  { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_create_vm:   { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_clone_lxc:   { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_clone_vm:    { category: 'provision', harmsTarget: false, irreversible: false },

  // --- power: lifecycle ---
  proxmox_start_lxc:    { category: 'power', harmsTarget: false, irreversible: false },
  proxmox_start_vm:     { category: 'power', harmsTarget: false, irreversible: false },
  proxmox_resume_vm:    { category: 'power', harmsTarget: false, irreversible: false },
  proxmox_stop_lxc:     { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_stop_vm:      { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_shutdown_lxc: { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_shutdown_vm:  { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_reboot_lxc:   { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_reboot_vm:    { category: 'power', harmsTarget: true,  irreversible: false },
  proxmox_pause_vm:     { category: 'power', harmsTarget: true,  irreversible: false },

  // --- power: hardware/config day-2 ops ---
  proxmox_resize_lxc:     { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_resize_vm:      { category: 'power', harmsTarget: true, irreversible: false },

  // disk ops — add/resize/move are recoverable; remove risks data loss
  proxmox_add_disk_vm:      { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_resize_disk_vm:   { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_resize_disk_lxc:  { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_move_disk_vm:     { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_move_disk_lxc:    { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_remove_disk_vm:   { category: 'power', harmsTarget: true, irreversible: true  },

  // mountpoint ops
  proxmox_add_mountpoint_lxc:    { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_remove_mountpoint_lxc: { category: 'power', harmsTarget: true, irreversible: true  },

  // network ops — add/update are recoverable; remove loses connectivity
  proxmox_add_network_vm:     { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_add_network_lxc:    { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_update_network_vm:  { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_update_network_lxc: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_remove_network_vm:  { category: 'power', harmsTarget: true, irreversible: true  },
  proxmox_remove_network_lxc: { category: 'power', harmsTarget: true, irreversible: true  },

  // --- snapshot ---
  proxmox_create_snapshot_lxc:  { category: 'snapshot', harmsTarget: false, irreversible: false },
  proxmox_create_snapshot_vm:   { category: 'snapshot', harmsTarget: false, irreversible: false },
  proxmox_rollback_snapshot_lxc: { category: 'snapshot', harmsTarget: true, irreversible: true  },
  proxmox_rollback_snapshot_vm:  { category: 'snapshot', harmsTarget: true, irreversible: true  },
  proxmox_delete_snapshot_lxc:   { category: 'snapshot', harmsTarget: true, irreversible: true  },
  proxmox_delete_snapshot_vm:    { category: 'snapshot', harmsTarget: true, irreversible: true  },

  // --- backup ---
  proxmox_create_backup_lxc: { category: 'backup', harmsTarget: false, irreversible: false },
  proxmox_create_backup_vm:  { category: 'backup', harmsTarget: false, irreversible: false },
  proxmox_restore_backup_lxc: { category: 'backup', harmsTarget: true, irreversible: true  },
  proxmox_restore_backup_vm:  { category: 'backup', harmsTarget: true, irreversible: true  },
  proxmox_delete_backup:      { category: 'backup', harmsTarget: false, irreversible: true  },

  // --- destroy ---
  proxmox_delete_lxc: { category: 'destroy', harmsTarget: true, irreversible: true },
  proxmox_delete_vm:  { category: 'destroy', harmsTarget: true, irreversible: true },
};

// config: { categories: {provision,power,snapshot,backup,destroy: bool}, protectedIds: Set<number> }
export function authorize(toolName, args = {}, config) {
  // Step 1: read-only allowlist — always permitted.
  if (READ_TOOLS.has(toolName)) return { allowed: true };

  // Step 2: mutating tool — look up metadata.
  const meta = TOOLS[toolName];

  // Step 3: unknown/unclassified → DENY (fail-closed).
  if (!meta) {
    return {
      allowed: false,
      reason: `'${toolName}' is not permitted by this server.`,
    };
  }

  // Step 4: category gate — must be explicitly enabled in config.
  if (!config.categories[meta.category]) {
    return {
      allowed: false,
      reason: `Category '${meta.category}' is disabled. Set ALLOW_${meta.category.toUpperCase()}=true in .env to enable '${toolName}'.`,
    };
  }

  // Step 5: vmid validation for tools that target a specific resource.
  const id = args.vmid != null && args.vmid !== '' ? Number(args.vmid) : null;
  if (meta.harmsTarget && (id == null || !Number.isInteger(id) || id <= 0)) {
    return {
      allowed: false,
      reason: `'${toolName}' targets a specific resource but no valid vmid was provided.`,
    };
  }

  // Step 6: protected-id check.
  if (meta.harmsTarget && id != null && isProtected(config.protectedIds, id)) {
    return {
      allowed: false,
      reason: `VMID ${id} is in PROTECTED_IDS and cannot be targeted by '${toolName}'. Protected resources can be snapshotted/backed up but not stopped, resized, rolled back, restored, or destroyed.`,
    };
  }

  // Step 7: irreversible ops require explicit confirmation.
  if (meta.irreversible && args.confirm !== true) {
    return {
      allowed: false,
      needsConfirm: true,
      reason: `'${toolName}' is irreversible. Re-call with confirm=true to proceed (target VMID ${id ?? 'n/a'}).`,
    };
  }

  return { allowed: true };
}
