export function nextFreeId(usedSet, lo, hi) {
  for (let i = lo; i <= hi; i++) {
    if (!usedSet.has(i)) return i;
  }
  return null;
}
