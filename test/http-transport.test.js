import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { ProxmoxServer } from '../index.js';

function envForHttp() {
  Object.assign(process.env, {
    PROXMOX_HOST: '10.0.0.1', PROXMOX_TOKEN_VALUE: 'x',
    PROTECTED_IDS: '100', MANAGED_RANGE: '400-499',
    MCP_TRANSPORT: 'http', MCP_BIND_ADDR: '127.0.0.1', MCP_HTTP_PORT: '0',
    MCP_BEARER_TOKEN: 'test-bearer',
  });
  delete process.env.MCP_TLS_CERT; delete process.env.MCP_TLS_KEY;
}

test('runHttp starts a server that 401s without a valid bearer', async () => {
  envForHttp();
  const s = new ProxmoxServer();
  const httpServer = await s.runHttp();
  const { port } = httpServer.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(res.status, 401);
  } finally {
    httpServer.close();
    await once(httpServer, 'close');
  }
});

test('runHttp 404s a non-/mcp path even with a valid bearer', async () => {
  envForHttp();
  const s = new ProxmoxServer();
  const httpServer = await s.runHttp();
  const { port } = httpServer.address();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/nope`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-bearer' },
      body: '{}',
    });
    assert.equal(res.status, 404);
  } finally {
    httpServer.close();
    await once(httpServer, 'close');
  }
});

test('valid bearer to /mcp reaches the MCP layer and the server survives', async () => {
  envForHttp();
  const s = new ProxmoxServer();
  const httpServer = await s.runHttp();
  const { port } = httpServer.address();
  try {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: 'Bearer test-bearer',
    };
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, { method: 'POST', headers, body });
    // The request must have passed OUR auth/route gates (not 401, not 404).
    // The MCP transport may return 200, 202, 400, or 500 depending on session state — all are fine.
    assert.notEqual(res.status, 401, 'should not be rejected by auth gate');
    assert.notEqual(res.status, 404, 'should not be rejected by route gate');
    await res.text(); // drain the body

    // Server still alive: a second (unauthenticated) request must still get a clean 401, not a dead socket.
    const res2 = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(res2.status, 401, 'server must still be responding after the first request');
  } finally {
    httpServer.close();
    await once(httpServer, 'close');
  }
});
