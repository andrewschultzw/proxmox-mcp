import { isProtected } from './idspec.js';

// Tool metadata. category drives the enable-flag check. harmsTarget = refused
// when the target id is in the protected set. irreversible = needs confirm=true.
// Tools NOT listed here default to read (always allowed).
export const TOOLS = {
  // provisioning
  proxmox_create_lxc: { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_create_vm: { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_clone_lxc: { category: 'provision', harmsTarget: false, irreversible: false },
  proxmox_clone_vm: { category: 'provision', harmsTarget: false, irreversible: false },
  // power management
  proxmox_start_lxc: { category: 'power', harmsTarget: false, irreversible: false },
  proxmox_start_vm: { category: 'power', harmsTarget: false, irreversible: false },
  proxmox_stop_lxc: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_stop_vm: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_reboot_lxc: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_reboot_vm: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_shutdown_lxc: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_shutdown_vm: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_resize_lxc: { category: 'power', harmsTarget: true, irreversible: false },
  proxmox_resize_vm: { category: 'power', harmsTarget: true, irreversible: false },
  // snapshots
  proxmox_create_snapshot: { category: 'snapshot', harmsTarget: false, irreversible: false },
  proxmox_rollback_snapshot: { category: 'snapshot', harmsTarget: true, irreversible: true },
  proxmox_delete_snapshot: { category: 'snapshot', harmsTarget: true, irreversible: true },
  // backups
  proxmox_create_backup: { category: 'backup', harmsTarget: false, irreversible: false },
  proxmox_restore_backup: { category: 'backup', harmsTarget: true, irreversible: true },
  // destroy
  proxmox_delete_lxc: { category: 'destroy', harmsTarget: true, irreversible: true },
  proxmox_delete_vm: { category: 'destroy', harmsTarget: true, irreversible: true },
};

// config: { categories: {provision,power,snapshot,backup,destroy: bool}, protectedIds: Set<number> }
export function authorize(toolName, args = {}, config) {
  const meta = TOOLS[toolName] || { category: 'read', harmsTarget: false, irreversible: false };

  if (meta.category === 'read') return { allowed: true };

  if (!config.categories[meta.category]) {
    return {
      allowed: false,
      reason: `Category '${meta.category}' is disabled. Set ALLOW_${meta.category.toUpperCase()}=true in .env to enable '${toolName}'.`,
    };
  }

  const id = args.vmid != null && args.vmid !== '' ? Number(args.vmid) : null;
  if (meta.harmsTarget && (id == null || !Number.isInteger(id) || id <= 0)) {
    return {
      allowed: false,
      reason: `'${toolName}' targets a specific resource but no valid vmid was provided.`,
    };
  }
  if (meta.harmsTarget && id != null && isProtected(config.protectedIds, id)) {
    return {
      allowed: false,
      reason: `VMID ${id} is in PROTECTED_IDS and cannot be targeted by '${toolName}'. Protected resources can be snapshotted/backed up but not stopped, resized, rolled back, restored, or destroyed.`,
    };
  }

  if (meta.irreversible && args.confirm !== true) {
    return {
      allowed: false,
      needsConfirm: true,
      reason: `'${toolName}' is irreversible. Re-call with confirm=true to proceed (target VMID ${id ?? 'n/a'}).`,
    };
  }

  return { allowed: true };
}
