# proxmox-mcp

A safety-gated Model Context Protocol server for a single-node Proxmox VE homelab.
Fork of [gilby125/mcp-proxmox](https://github.com/gilby125/mcp-proxmox) (MIT, © 2024 Kevin), extended with:
- A config-driven gate (per-category flags + protected-ID set + confirmation for irreversible ops), fail-closed by default
- A bind-mount snapshot guard and a RAM over-commit preflight
- `proxmox_export_inventory`, `proxmox_get_next_id_in_range`, `proxmox_suggest_ip`, and CT-300 SSH-key injection on create

## Setup (stdio / local)
1. `npm install`
2. Copy `.env.example` to `../.env` (the loader reads ONE directory above `index.js`) and fill in `PROXMOX_TOKEN_VALUE` etc.
3. `npm test` to verify.
4. `node index.js` to run over stdio.

Hosting on CT 300 over HTTP (transport, bearer auth, systemd, Proxmox role) is Plan B.

## HTTP transport (Plan B)
Set `MCP_TRANSPORT=http` plus `MCP_BEARER_TOKEN`, `MCP_BIND_ADDR`, `MCP_HTTP_PORT`, and (recommended) `MCP_ALLOWED_HOSTS`. Optional TLS: set `MCP_TLS_CERT`/`MCP_TLS_KEY`. Run as a service with `deploy/proxmox-mcp.service`. Register a client with `claude mcp add --transport http proxmox <url> --header "Authorization: Bearer <token>"` (add `CF-Access-Client-Id`/`CF-Access-Client-Secret` headers when behind Cloudflare Access). See the hosting runbook in docs for CF Access, NPM, and the mcp@pve role.

## Safety model
All mutating tools pass through `authorize()` (`lib/gating.js`) once at dispatch; the gate is fail-closed (any tool not explicitly classified is denied). Read tools are always allowed. With every `ALLOW_*` flag false, the server is read-only. `PROTECTED_IDS` can be snapshotted/backed up but never stopped, resized, rolled back, restored, or destroyed.
