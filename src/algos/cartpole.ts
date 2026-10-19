/**
 * Cart-pole: nonlinear dynamics + discrete-time LQR (gain from Riccati iteration on the
 * linearization about upright). State s = [x, xDot, theta, thetaDot], theta = 0 is upright.
 */
export const CP = { M: 1.0, m: 0.25, l: 0.6, g: 9.81, dt: 1 / 240, ctrlDt: 1 / 60, uMax: 40, track: 2.6 }

export function deriv(s: number[], u: number): number[] {
  const { M, m, l, g } = CP
  const [, xd, th, thd] = s
  const st = Math.sin(th), ct = Math.cos(th)
  const tmp = (u + m * l * thd * thd * st) / (M + m)
  const thdd = (g * st - ct * tmp) / (l * (4 / 3 - (m * ct * ct) / (M + m)))
  const xdd = tmp - (m * l * thdd * ct) / (M + m)
  return [xd, xdd, thd, thdd]
}

export function rk4(s: number[], u: number, dt: number): number[] {
  const k1 = deriv(s, u)
  const k2 = deriv(s.map((v, i) => v + (dt / 2) * k1[i]), u)
  const k3 = deriv(s.map((v, i) => v + (dt / 2) * k2[i]), u)
  const k4 = deriv(s.map((v, i) => v + dt * k3[i]), u)
  return s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

type M4 = number[][]
const mul = (A: M4, B: M4) => A.map((r) => B[0].map((_, j) => r.reduce((acc, v, k) => acc + v * B[k][j], 0)))
const T = (A: M4) => A[0].map((_, j) => A.map((r) => r[j]))
const add = (A: M4, B: M4) => A.map((r, i) => r.map((v, j) => v + B[i][j]))
const sub = (A: M4, B: M4) => A.map((r, i) => r.map((v, j) => v - B[i][j]))

/** Discrete LQR gain K (1x4) via Riccati iteration. */
export function lqrGain(Q = [8, 1, 120, 8], R = 0.05): number[] {
  const { M, m, l, g } = CP
  const dt = CP.ctrlDt // controller runs at 60 Hz with zero-order hold
  // linearized continuous dynamics about theta = 0
  const den = l * (4 / 3 - m / (M + m))
  const a = g / den, b = -1 / ((M + m) * den)
  const c = -(m * l * a) / (M + m), d = 1 / (M + m) - (m * l * b) / (M + m)
  const A: M4 = [[0, 1, 0, 0], [0, 0, c, 0], [0, 0, 0, 1], [0, 0, a, 0]]
  const B: M4 = [[0], [d], [0], [b]]
  const Ad = A.map((r, i) => r.map((v, j) => (i === j ? 1 : 0) + v * dt))
  const Bd = B.map((r) => [r[0] * dt])
  const Qm: M4 = Q.map((q, i) => Q.map((_, j) => (i === j ? q : 0)))
  let P = Qm
  let K = [[0, 0, 0, 0]]
  for (let it = 0; it < 20000; it++) {
    const BtP = mul(T(Bd), P)
    const S = R + mul(BtP, Bd)[0][0]
    K = mul(BtP, Ad).map((r) => r.map((v) => v / S))
    const Praw = add(Qm, sub(mul(mul(T(Ad), P), Ad), mul(mul(T(mul(BtP, Ad)), [[1 / S]]), mul(BtP, Ad))))
    // symmetrize each step: keeps the iteration numerically stable
    const Pn = Praw.map((r, i) => r.map((v, j) => (v + Praw[j][i]) / 2))
    const diff = Pn.flat().reduce((acc, v, i) => Math.max(acc, Math.abs(v - P.flat()[i])), 0)
    P = Pn
    if (diff < 1e-6) break
  }
  return K[0]
}
