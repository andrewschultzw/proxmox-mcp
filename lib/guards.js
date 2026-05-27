// Proxmox cannot snapshot an LXC that has bind/extra mounts (mp0..mpN).
export function hasBindMounts(lxcConfig) {
  if (!lxcConfig || typeof lxcConfig !== 'object') return false;
  return Object.keys(lxcConfig).some((k) => /^mp\d+$/.test(k));
}
