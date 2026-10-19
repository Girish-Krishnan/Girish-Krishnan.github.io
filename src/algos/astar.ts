/** Grid A* (8-connected, octile heuristic, no corner cutting). Returns path cells and the closed-set expansion order. */
export interface AStarResult { path: [number, number][]; expanded: [number, number][]; ms: number }

export function astar(w: number, h: number, blocked: (x: number, y: number) => boolean, start: [number, number], goal: [number, number]): AStarResult {
  const t0 = performance.now()
  const N = w * h
  const g = new Float32Array(N).fill(Infinity)
  const f = new Float32Array(N).fill(Infinity)
  const came = new Int32Array(N).fill(-1)
  const closed = new Uint8Array(N)
  const idx = (x: number, y: number) => y * w + x
  const hfn = (x: number, y: number) => {
    const dx = Math.abs(x - goal[0]), dy = Math.abs(y - goal[1])
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy)
  }
  // binary heap of indices keyed by f
  const heap: number[] = []
  const push = (i: number) => {
    heap.push(i)
    let c = heap.length - 1
    while (c > 0) { const p = (c - 1) >> 1; if (f[heap[p]] <= f[heap[c]]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p }
  }
  const pop = () => {
    const top = heap[0], last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let c = 0
      for (;;) {
        const l = 2 * c + 1, r = l + 1
        let m = c
        if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l
        if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r
        if (m === c) break
        ;[heap[m], heap[c]] = [heap[c], heap[m]]; c = m
      }
    }
    return top
  }
  const s = idx(...start), gi = idx(...goal)
  g[s] = 0; f[s] = hfn(...start); push(s)
  const expanded: [number, number][] = []
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
  while (heap.length) {
    const cur = pop()
    if (closed[cur]) continue
    closed[cur] = 1
    const cx = cur % w, cy = (cur / w) | 0
    expanded.push([cx, cy])
    if (cur === gi) break
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || blocked(nx, ny)) continue
      if (dx && dy && (blocked(cx + dx, cy) || blocked(cx, cy + dy))) continue
      const ni = idx(nx, ny)
      if (closed[ni]) continue
      const ng = g[cur] + (dx && dy ? Math.SQRT2 : 1)
      if (ng < g[ni]) { g[ni] = ng; f[ni] = ng + hfn(nx, ny); came[ni] = cur; push(ni) }
    }
  }
  const path: [number, number][] = []
  if (closed[gi]) for (let c = gi; c !== -1; c = came[c]) path.unshift([c % w, (c / w) | 0])
  return { path, expanded, ms: performance.now() - t0 }
}
