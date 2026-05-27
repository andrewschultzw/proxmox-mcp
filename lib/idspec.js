// Parse a spec like "100-115,200,300-302" into a Set<number>.
export function parseIdSpec(spec) {
  const out = new Set();
  if (!spec) return out;
  for (const part of String(spec).split(',')) {
    const piece = part.trim();
    if (!piece) continue;
    const m = piece.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      const lo = Number(m[1]);
      const hi = Number(m[2]);
      for (let i = lo; i <= hi; i++) out.add(i);
    } else {
      out.add(Number(piece));
    }
  }
  return out;
}

export function isProtected(protectedSet, id) {
  return protectedSet.has(Number(id));
}

export function inManagedRange(lo, hi, id) {
  const n = Number(id);
  return n >= lo && n <= hi;
}
