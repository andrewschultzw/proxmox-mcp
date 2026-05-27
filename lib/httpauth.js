import { timingSafeEqual } from 'node:crypto';

// Constant-time bearer-token check for the HTTP transport.
export function isAuthorized(authHeader, expectedToken) {
  if (!expectedToken || typeof authHeader !== 'string') return false;
  const prefix = 'Bearer ';
  if (!authHeader.startsWith(prefix)) return false;
  const provided = Buffer.from(authHeader.slice(prefix.length), 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');
  if (provided.length !== expected.length) return false; // timingSafeEqual requires equal length
  return timingSafeEqual(provided, expected);
}

// True when both a TLS cert and key path are configured (enables https listener).
export function tlsConfigured(env) {
  return Boolean(env && env.MCP_TLS_CERT && env.MCP_TLS_KEY);
}
