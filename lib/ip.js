// Extract the final octet of a static IPv4 from a PVE net config string.
// e.g. "name=eth0,bridge=vmbr0,ip=192.168.1.123/24,gw=192.168.1.1" -> 123
export function ipFromNetConfig(netStr) {
  if (!netStr) return null;
  const m = String(netStr).match(/ip=(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  return m ? Number(m[4]) : null;
}

export function nextFreeIp(usedOctets, start, end) {
  for (let i = start; i <= end; i++) {
    if (!usedOctets.has(i)) return i;
  }
  return null;
}
