import { ipFromNetConfig } from './ip.js';

const GB = 1024 ** 3;

export function buildInventoryRows(resources, configs) {
  return (resources || [])
    .filter((r) => r.type === 'lxc' || r.type === 'qemu')
    .map((r) => {
      const octet = ipFromNetConfig(configs?.[r.vmid]?.net0);
      return {
        id: Number(r.vmid),
        name: r.name || '',
        type: r.type,
        status: r.status || '',
        ip: octet != null ? `192.168.1.${octet}` : '',
        memGB: r.maxmem ? +(r.maxmem / GB).toFixed(1) : 0,
        diskGB: r.maxdisk ? +(r.maxdisk / GB).toFixed(1) : 0,
      };
    })
    .sort((a, b) => a.id - b.id);
}

export function formatInventoryMarkdown(rows) {
  const header = '| ID | Name | Type | Status | IP | Mem (GB) | Disk (GB) |\n|---|---|---|---|---|---|---|';
  const body = rows
    .map((r) => `| ${r.id} | ${r.name} | ${r.type} | ${r.status} | ${r.ip} | ${r.memGB} | ${r.diskGB} |`)
    .join('\n');
  return `# Proxmox Inventory\n\n${header}\n${body}\n`;
}
