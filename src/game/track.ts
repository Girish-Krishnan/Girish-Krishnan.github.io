/**
 * Time-trial track: closed Catmull-Rom centerline east of the lab, resampled by arc length.
 * Pure math (no three.js) so both the scene and the DOM UI can use it.
 */
export const TRACK_W = 8
const CTRL: [number, number][] = [
  [34, 0], [34, -20], [42, -38], [62, -48], [88, -46], [106, -32], [106, -10], [90, -2],
  [74, 10], [76, 28], [96, 30], [110, 36], [112, 50], [94, 55], [72, 54], [58, 52], [42, 40], [35, 20],
]
export const N = 800
export const CHECKPOINTS = 8

/** Centripetal Catmull-Rom (alpha = 0.5): no cusps or overshoot on unevenly spaced points. */
function centripetal(P0: [number, number], P1: [number, number], P2: [number, number], P3: [number, number], u: number): [number, number] {
  const td = (a: [number, number], b: [number, number]) => Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5)
  const t0 = 0, t1 = t0 + td(P0, P1), t2 = t1 + td(P1, P2), t3 = t2 + td(P2, P3)
  const t = t1 + (t2 - t1) * u
  const lerp = (a: [number, number], b: [number, number], ta: number, tb: number): [number, number] => {
    const w = (t - ta) / (tb - ta)
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]
  }
  const A1 = lerp(P0, P1, t0, t1), A2 = lerp(P1, P2, t1, t2), A3 = lerp(P2, P3, t2, t3)
  const B1 = lerp(A1, A2, t0, t2), B2 = lerp(A2, A3, t1, t3)
  return lerp(B1, B2, t1, t2)
}

function resample(poly: [number, number][], M: number): [number, number][] {
  const cum = [0]
  for (let i = 1; i <= poly.length; i++) { const p = poly[i % poly.length], q = poly[i - 1]; cum.push(cum[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])) }
  const L = cum[cum.length - 1], out: [number, number][] = []
  let j = 0
  for (let i = 0; i < M; i++) {
    const s = (i / M) * L
    while (cum[j + 1] < s) j++
    const f = (s - cum[j]) / (cum[j + 1] - cum[j]), p = poly[j], q = poly[(j + 1) % poly.length]
    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f])
  }
  return out
}

export const track = (() => {
  const fine: [number, number][] = []
  const n = CTRL.length, SUB = 200
  for (let i = 0; i < n; i++) {
    const a = CTRL[(i - 1 + n) % n], b = CTRL[i], c = CTRL[(i + 1) % n], d = CTRL[(i + 2) % n]
    for (let k = 0; k < SUB; k++) fine.push(centripetal(a, b, c, d, k / SUB))
  }
  // relax tight corners: smooth a coarse version, then resample finely by arc length
  let coarse = resample(fine, 200)
  for (let pass = 0; pass < 80; pass++) coarse = coarse.map((p, i) => {
    const a = coarse[(i - 1 + 200) % 200], c = coarse[(i + 1) % 200]
    return [(a[0] + 2 * p[0] + c[0]) / 4, (a[1] + 2 * p[1] + c[1]) / 4] as [number, number]
  })
  // keep the start line at the first control point
  const off = coarse.reduce((bi, p, i) => (Math.hypot(p[0] - CTRL[0][0], p[1] - CTRL[0][1]) < Math.hypot(coarse[bi][0] - CTRL[0][0], coarse[bi][1] - CTRL[0][1]) ? i : bi), 0)
  coarse = [...coarse.slice(off), ...coarse.slice(0, off)]
  const pts = resample(resample(coarse, 4000), N)
  const x = new Float32Array(N), z = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N), kappa = new Float32Array(N)
  pts.forEach((p, i) => { x[i] = p[0]; z[i] = p[1] })
  let L = 0
  for (let i = 0; i < N; i++) { const b = (i + 1) % N; L += Math.hypot(x[b] - x[i], z[b] - z[i]) }
  const ds = L / N
  for (let i = 0; i < N; i++) {
    const a = (i - 1 + N) % N, b = (i + 1) % N
    const dx = x[b] - x[a], dz = z[b] - z[a], m = Math.hypot(dx, dz)
    tx[i] = dx / m; tz[i] = dz / m
  }
  for (let i = 0; i < N; i++) {
    const b = (i + 1) % N
    const cross = tx[i] * tz[b] - tz[i] * tx[b], dot = tx[i] * tx[b] + tz[i] * tz[b]
    kappa[i] = Math.atan2(cross, dot) / ds
  }
  const cps = Array.from({ length: CHECKPOINTS }, (_, k) => Math.round(((k + 1) * N) / (CHECKPOINTS + 1)))
  return { x, z, tx, tz, kappa, L, ds, cps }
})()

/** Heading convention matches the vehicle: forward = (sin h, cos h). */
export const headingAt = (i: number) => Math.atan2(track.tx[i], track.tz[i])

export function nearest(px: number, pz: number, hint = -1): { i: number; d: number } {
  let best = -1, bd = Infinity
  const scan = (i: number) => { const d = (track.x[i] - px) ** 2 + (track.z[i] - pz) ** 2; if (d < bd) { bd = d; best = i } }
  if (hint >= 0) for (let k = -40; k <= 40; k++) scan((hint + k + N) % N)
  if (hint < 0 || bd > 64) for (let i = 0; i < N; i++) scan(i)
  return { i: best, d: Math.sqrt(bd) }
}

/**
 * "Girish's dev ghost": a pace target generated from a curvature-limited speed profile along the
 * centerline (forward/backward passes with accel/brake limits) — the lap a well-tuned
 * pure-pursuit F1TENTH controller would roughly drive on this track.
 */
export const devGhost = (() => {
  const VMAX = 15, ALAT = 9, ACC = 7, BRK = 12
  const v = new Float32Array(N)
  for (let i = 0; i < N; i++) v[i] = Math.min(VMAX, Math.sqrt(ALAT / Math.max(1e-4, Math.abs(track.kappa[i]))))
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N; i++) { const b = (i + 1) % N; v[b] = Math.min(v[b], Math.sqrt(v[i] ** 2 + 2 * ACC * track.ds)) }
    for (let i = N - 1; i >= 0; i--) { const a = (i - 1 + N) % N; v[a] = Math.min(v[a], Math.sqrt(v[i] ** 2 + 2 * BRK * track.ds)) }
  }
  const tAt = new Float32Array(N + 1)
  for (let i = 0; i < N; i++) tAt[i + 1] = tAt[i] + track.ds / ((v[i] + v[(i + 1) % N]) / 2)
  const lapMs = Math.round(tAt[N] * 1000)
  // samples [t, x, z, h] every 50 ms
  const samples: number[] = []
  let i = 0
  for (let t = 0; t <= tAt[N]; t += 0.05) {
    while (i < N - 1 && tAt[i + 1] < t) i++
    const f = (t - tAt[i]) / (tAt[i + 1] - tAt[i]), b = (i + 1) % N
    samples.push(t * 1000, track.x[i] + (track.x[b] - track.x[i]) * f, track.z[i] + (track.z[b] - track.z[i]) * f, headingAt(i))
  }
  return { lapMs, samples, vmax: VMAX }
})()

export const fmtLap = (ms: number) => {
  const m = Math.floor(ms / 60000), s = (ms % 60000) / 1000
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}
