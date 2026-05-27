// Guard against over-committing RAM on a memory-constrained host.
// freeBytes: node's free memory in bytes (PVE /nodes/{n}/status -> memory.free)
export function ramPreflight({ requestMB, freeBytes, headroomMB = 512 }) {
  const freeMB = Math.floor(freeBytes / (1024 * 1024));
  const usableMB = freeMB - headroomMB;
  if (requestMB > usableMB) {
    return {
      ok: false,
      message: `Requested ${requestMB}MB exceeds usable free memory (${usableMB}MB = ${freeMB}MB free − ${headroomMB}MB headroom). Refusing to over-commit.`,
    };
  }
  return { ok: true, message: `OK: ${requestMB}MB fits in ${usableMB}MB usable.` };
}
