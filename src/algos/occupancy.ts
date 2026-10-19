/** Occupancy grid of the lab, shared by the SLAM sim (scene) and the minimap (UI). */
export const OCC = { x0: -25, z0: -25, size: 50, res: 0.5, n: 100, interiorR: 23.3 }
export const occ = {
  logodds: new Float32Array(OCC.n * OCC.n),
  seen: new Uint8Array(OCC.n * OCC.n),
  interior: (() => {
    const m = new Uint8Array(OCC.n * OCC.n)
    for (let j = 0; j < OCC.n; j++) for (let i = 0; i < OCC.n; i++) {
      const x = OCC.x0 + (i + 0.5) * OCC.res, z = OCC.z0 + (j + 0.5) * OCC.res
      if (Math.hypot(x, z) < OCC.interiorR) m[j * OCC.n + i] = 1
    }
    return m
  })(),
  interiorCount: 0,
  seenInterior: 0,
  version: 0,
  trail: [] as [number, number][],
}
occ.interiorCount = occ.interior.reduce((a, b) => a + b, 0)

export function cellOf(x: number, z: number): number {
  const i = Math.floor((x - OCC.x0) / OCC.res), j = Math.floor((z - OCC.z0) / OCC.res)
  if (i < 0 || j < 0 || i >= OCC.n || j >= OCC.n) return -1
  return j * OCC.n + i
}
export function observe(c: number, hit: boolean) {
  if (c < 0) return
  occ.logodds[c] = Math.max(-4, Math.min(4, occ.logodds[c] + (hit ? 0.9 : -0.35)))
  if (!occ.seen[c]) { occ.seen[c] = 1; if (occ.interior[c]) occ.seenInterior++ }
}
export const coverage = () => occ.seenInterior / occ.interiorCount
export function resetMap() { occ.logodds.fill(0); occ.seen.fill(0); occ.seenInterior = 0; occ.trail = []; occ.version++ }
