/**
 * Weld seam challenge (inspired by Girish's Argon Robotics work: seam detection + precision control).
 * Pure logic, no three.js: plate coordinates are metres, u across the plate, v toward the visitor.
 * The "detector" is a stand-in for a CNN (smoothing + a confidence heuristic), not a real model.
 */
export type Pt = { u: number; v: number }
export const PLATE = { w: 1.6, h: 1.0, margin: 0.06 }
export const WELD_SPEED = 0.2 // m/s torch travel
export const A_MAX = 1.2 // m/s² torch acceleration limit
export const V_MIN = 0.12 // m/s: slower than this and the bead burns through, so the arm won't crawl
const A_LAT = 0.5 // m/s² lateral budget used to plan corner slow-downs
export const CLEAN = 85 // bead quality needed for "Lay a clean weld"
export const SCAN_TIME = 2.2 // s
export type Phase = 'idle' | 'drawn' | 'scanning' | 'detected' | 'welding' | 'done'
export type Preset = 'straight' | 'L' | 'curve'
export const PRESETS: Preset[] = ['straight', 'L', 'curve']

/** Current arm joint angles (rad), written by the 3D module each frame. */
export const armJoints = { q: [0, 0, 0, 0, 0, 0] }

export const weld = {
  phase: 'idle' as Phase,
  drawn: [] as Pt[],
  seam: [] as Pt[],
  confidence: 0,
  roughness: 0, // mm, raw stroke vs smoothed
  scan: 0, // 0..1
  // torch tracking state
  s: 0, // arc length along the seam of the commanded point
  sp: 0, // commanded travel speed
  tool: { u: 0, v: 0 },
  vel: { u: 0, v: 0 },
  bead: [] as { u: number; v: number; t: number }[],
  errSq: 0, errN: 0, errMax: 0,
  rmsMm: 0, maxMm: 0, quality: 0,
  stage: 'approach' as 'approach' | 'track' | 'retract',
  stageT: 0,
  version: 0, // bumps whenever drawn/seam changes (UI redraw)
}

const clampU = (u: number) => Math.max(-PLATE.w / 2 + PLATE.margin, Math.min(PLATE.w / 2 - PLATE.margin, u))
const clampV = (v: number) => Math.max(-PLATE.h / 2 + PLATE.margin, Math.min(PLATE.h / 2 - PLATE.margin, v))
export const clampPt = (p: Pt): Pt => ({ u: clampU(p.u), v: clampV(p.v) })

export function pathLength(p: Pt[]) {
  let L = 0
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].u - p[i - 1].u, p[i].v - p[i - 1].v)
  return L
}

/** Evenly resample a polyline at `step` metres. */
export function resample(p: Pt[], step = 0.01): Pt[] {
  if (p.length < 2) return p.slice()
  const out: Pt[] = [p[0]]
  let carry = 0
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i]
    const seg = Math.hypot(b.u - a.u, b.v - a.v)
    let d = step - carry
    while (d <= seg) {
      const t = d / seg
      out.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t })
      d += step
    }
    carry = seg - (d - step)
  }
  const last = p[p.length - 1]
  if (Math.hypot(last.u - out[out.length - 1].u, last.v - out[out.length - 1].v) > step * 0.3) out.push(last)
  return out
}

function smooth(p: Pt[], win: number): Pt[] {
  return p.map((_, i) => {
    let u = 0, v = 0, n = 0
    for (let k = -win; k <= win; k++) {
      const j = Math.min(p.length - 1, Math.max(0, i + k))
      u += p[j].u; v += p[j].v; n++
    }
    return { u: u / n, v: v / n }
  })
}

export function presetPath(kind: Preset): Pt[] {
  if (kind === 'straight') return [{ u: -0.65, v: 0 }, { u: 0.65, v: 0 }]
  if (kind === 'L') return [{ u: -0.55, v: 0.36 }, { u: -0.55, v: -0.3 }, { u: 0.62, v: -0.3 }]
  const out: Pt[] = []
  for (let i = 0; i <= 60; i++) { const u = -0.65 + (1.3 * i) / 60; out.push({ u, v: 0.22 * Math.sin((u / 0.65) * Math.PI) }) }
  return out
}

function bump() { weld.version++ }

export function resetRun() {
  weld.bead = []; weld.errSq = 0; weld.errN = 0; weld.errMax = 0
  weld.rmsMm = 0; weld.maxMm = 0; weld.quality = 0; weld.s = 0; weld.sp = 0
}

/** Start a new freehand stroke (or replace the path with a preset). */
export function setDrawn(p: Pt[]) {
  weld.drawn = p.map(clampPt)
  weld.seam = []; weld.confidence = 0; weld.scan = 0
  resetRun()
  weld.phase = weld.drawn.length > 1 && pathLength(weld.drawn) > 0.2 ? 'drawn' : 'idle'
  bump()
}
export function addDrawnPoint(p: Pt) {
  const q = clampPt(p)
  const last = weld.drawn[weld.drawn.length - 1]
  if (!last || Math.hypot(q.u - last.u, q.v - last.v) > 0.008) { weld.drawn.push(q); bump() }
}
export const busy = () => weld.phase === 'scanning' || weld.phase === 'welding'

/** The simulated detector: resample, denoise, and grade how seam-like the stroke is. */
export function detect() {
  const raw = resample(weld.drawn, 0.01)
  const sm = smooth(raw, 4)
  let dev = 0
  let nDev = 0
  for (let i = 4; i < raw.length - 4; i++) { dev += (raw[i].u - sm[i].u) ** 2 + (raw[i].v - sm[i].v) ** 2; nDev++ }
  weld.roughness = Math.sqrt(dev / Math.max(1, nDev)) * 1000
  const L = pathLength(raw)
  // a tiny bit of "sensor noise" so the detection never matches the stroke exactly
  weld.seam = smooth(sm, 2).map((p, i) => ({ u: p.u + Math.sin(i * 1.7) * 0.0008, v: p.v + Math.cos(i * 2.3) * 0.0008 }))
  weld.confidence = Math.max(0.2, Math.min(0.99, 0.985 - weld.roughness * 0.045 - (L < 0.35 ? 0.3 : 0)))
  bump()
}

/** Point at arc length s along the seam (seam is resampled at 1 cm). */
export function seamAt(s: number): Pt {
  const p = weld.seam
  const f = Math.max(0, Math.min(p.length - 1, s / 0.01))
  const i = Math.floor(f), t = f - i
  const a = p[i], b = p[Math.min(p.length - 1, i + 1)]
  return { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }
}
export const seamLength = () => (weld.seam.length - 1) * 0.01

function crossTrack(p: Pt, s: number) {
  const P = weld.seam, i0 = Math.max(0, Math.floor(s / 0.01) - 10), i1 = Math.min(P.length - 1, Math.ceil(s / 0.01) + 3)
  let best = Infinity
  for (let i = i0; i < i1; i++) {
    const a = P[i], b = P[i + 1]
    const du = b.u - a.u, dv = b.v - a.v, l2 = du * du + dv * dv || 1e-9
    const t = Math.max(0, Math.min(1, ((p.u - a.u) * du + (p.v - a.v) * dv) / l2))
    best = Math.min(best, Math.hypot(p.u - a.u - du * t, p.v - a.v - dv * t))
  }
  return best === Infinity ? 0 : best
}

/** Max curvature (1/m) over the next ~6 cm of seam: heading change per unit length. */
function curvatureAhead(s: number) {
  let k = 0
  for (let d = 0; d <= 0.06; d += 0.02) {
    const a = seamAt(s + d), b = seamAt(s + d + 0.02), c = seamAt(s + d + 0.04)
    const h1 = Math.atan2(b.v - a.v, b.u - a.u), h2 = Math.atan2(c.v - b.v, c.u - b.u)
    let dh = Math.abs(h2 - h1); if (dh > Math.PI) dh = 2 * Math.PI - dh
    k = Math.max(k, dh / 0.02)
  }
  return k
}

/**
 * One tracking step: the commanded point advances at WELD_SPEED; the torch follows with a
 * PD + feed-forward tracker under an acceleration limit. Error = torch vs commanded point.
 */
export function trackStep(dt: number) {
  const L = seamLength()
  // speed profile: ramp up, slow for corners (curvature over the next few cm), ramp down at the end
  const k = curvatureAhead(weld.s)
  const vCorner = Math.max(V_MIN, Math.sqrt(A_LAT / Math.max(k, 1e-3)))
  const vEnd = Math.sqrt(2 * 0.6 * Math.max(0, L - weld.s))
  const vCap = Math.min(WELD_SPEED, vCorner, Math.max(0.02, vEnd))
  const sp0 = weld.sp
  weld.sp = Math.min(vCap, weld.sp + 0.6 * dt)
  const along = (weld.sp - sp0) / dt // tangential acceleration feed-forward
  weld.s = Math.min(L, weld.s + weld.sp * dt)
  const tgt = seamAt(weld.s)
  const ahead = seamAt(Math.min(L, weld.s + 0.01))
  const dl = Math.hypot(ahead.u - tgt.u, ahead.v - tgt.v) || 1
  const ff = weld.s < L ? { u: ((ahead.u - tgt.u) / dl) * weld.sp, v: ((ahead.v - tgt.v) / dl) * weld.sp } : { u: 0, v: 0 }
  const kp = 140, kd = 2 * Math.sqrt(kp)
  const tu = (ahead.u - tgt.u) / dl, tv = (ahead.v - tgt.v) / dl
  let au = kp * (tgt.u - weld.tool.u) + kd * (ff.u - weld.vel.u) + tu * along
  let av = kp * (tgt.v - weld.tool.v) + kd * (ff.v - weld.vel.v) + tv * along
  const a = Math.hypot(au, av)
  if (a > A_MAX) { au *= A_MAX / a; av *= A_MAX / a }
  weld.vel.u += au * dt; weld.vel.v += av * dt
  weld.tool.u += weld.vel.u * dt; weld.tool.v += weld.vel.v * dt
  // cross-track error: distance from the torch to the seam near where it should be (along-track lag doesn't hurt a bead)
  const e = crossTrack(weld.tool, weld.s)
  weld.errSq += e * e; weld.errN++; weld.errMax = Math.max(weld.errMax, e)
  weld.rmsMm = Math.sqrt(weld.errSq / weld.errN) * 1000
  weld.maxMm = weld.errMax * 1000
  // bead quality: tracking accuracy, scaled by how sure the detector was (a shaky seam = aiming at a guess)
  weld.quality = Math.max(0, Math.min(100, (100 - 2.2 * weld.rmsMm - 0.6 * weld.maxMm) * (0.55 + 0.45 * weld.confidence)))
  return weld.s >= L && Math.hypot(tgt.u - weld.tool.u, tgt.v - weld.tool.v) < 0.002
}

/** Offline run (tests/tuning): simulate a full weld and return the score. */
export function simulate(seam: Pt[], dt = 1 / 120) {
  weld.seam = seam; resetRun()
  weld.tool = { ...seam[0] }; weld.vel = { u: 0, v: 0 }
  let n = 0
  while (!trackStep(dt) && n++ < 20000) { /* run */ }
  return { rms: weld.rmsMm, max: weld.maxMm, quality: weld.quality }
}
