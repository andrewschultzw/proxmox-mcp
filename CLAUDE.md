# proxmox-mcp — Claude Instructions

Fork of gilby125/mcp-proxmox (MIT, © 2024 Kevin). Single-file ES-module MCP server (`index.js`, class `ProxmoxServer`); new logic lives in pure-function modules under `lib/`.

## Run / test
- Test: `npm test` (node:test, `test/*.test.js`)
- Stdio smoke: `node index.js` with a populated `../.env` (loader reads ONE level up from index.js)

## Safety model
A single `authorize()` gate (lib/gating.js) runs once in the CallTool handler before the switch. Config (env): per-category flags ALLOW_PROVISION/POWER/SNAPSHOT/BACKUP/DESTROY, PROTECTED_IDS, MANAGED_RANGE. Never weaken the gate to "make a tool work" — fix the config.

## Conventions
ID ranges 1xx infra / 2xx web / 3xx dev-AI; MANAGED_RANGE (lab) is freely managed; PROTECTED_IDS refuse harmful ops. Secrets live in ../.env, never committed.
