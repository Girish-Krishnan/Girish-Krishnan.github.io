/** RRT in a 2D box with axis-aligned rectangular obstacles (already inflated). */
export interface Rect { x0: number; z0: number; x1: number; z1: number }
export interface RRTResult { nodes: { x: number; z: number; parent: number }[]; path: { x: number; z: number }[]; ms: number; iters: number }

const inside = (r: Rect, x: number, z: number) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1
export function segmentFree(obs: Rect[], ax: number, az: number, bx: number, bz: number, step = 0.08) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step))
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t
    for (const r of obs) if (inside(r, x, z)) return false
  }
  return true
}

export function rrt(bounds: Rect, obs: Rect[], start: { x: number; z: number }, goal: { x: number; z: number }, opts = { step: 0.45, goalBias: 0.12, maxIters: 4000, goalTol: 0.4 }, rand = Math.random): RRTResult {
  const t0 = performance.now()
  const nodes = [{ ...start, parent: -1 }]
  let found = -1, iters = 0
  for (; iters < opts.maxIters && found < 0; iters++) {
    const sx = rand() < opts.goalBias ? goal.x : bounds.x0 + rand() * (bounds.x1 - bounds.x0)
    const sz = rand() < opts.goalBias ? goal.z : bounds.z0 + rand() * (bounds.z1 - bounds.z0)
    let bi = 0, bd = Infinity
    for (let i = 0; i < nodes.length; i++) { const d = (nodes[i].x - sx) ** 2 + (nodes[i].z - sz) ** 2; if (d < bd) { bd = d; bi = i } }
    const nb = nodes[bi], d = Math.sqrt(bd) || 1
    const k = Math.min(1, opts.step / d)
    const nx = nb.x + (sx - nb.x) * k, nz = nb.z + (sz - nb.z) * k
    if (!segmentFree(obs, nb.x, nb.z, nx, nz)) continue
    nodes.push({ x: nx, z: nz, parent: bi })
    if (Math.hypot(nx - goal.x, nz - goal.z) < opts.goalTol && segmentFree(obs, nx, nz, goal.x, goal.z)) {
      nodes.push({ ...goal, parent: nodes.length - 1 })
      found = nodes.length - 1
    }
  }
  let path: { x: number; z: number }[] = []
  if (found >= 0) for (let c = found; c !== -1; c = nodes[c].parent) path.unshift({ x: nodes[c].x, z: nodes[c].z })
  // greedy shortcut smoothing
  if (path.length > 2) {
    const sm = [path[0]]
    let i = 0
    while (i < path.length - 1) {
      let j = path.length - 1
      while (j > i + 1 && !segmentFree(obs, path[i].x, path[i].z, path[j].x, path[j].z)) j--
      sm.push(path[j]); i = j
    }
    path = sm
  }
  return { nodes, path, ms: performance.now() - t0, iters }
}
