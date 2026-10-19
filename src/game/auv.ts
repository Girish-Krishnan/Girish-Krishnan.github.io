// mirrors TANK in scene/layout.ts (kept three.js-free so the DOM widget can import it)
const TANK = { waterY: -0.3, floorY: -4 }

/**
 * AUV depth hold: a PID loop on depth driving a vertical thruster, with simple heave dynamics
 * (slight positive buoyancy + linear drag) so the integral term has real work to do.
 * Depth is metres below the waterline, positive down.
 */
export const PID = { kp: 2.2, ki: 0.5, kd: 1.6, uMax: 2.5 }
export const DEPTH_MIN = 0.4
export const DEPTH_MAX = 3.2
const BUOYANCY = -0.25 // m/s² upward drift with no thrust
const DRAG = 1.2

export const auv = {
  hold: true,
  setpoint: 1.0,
  depth: 0,
  w: 0, // heave rate, m/s, positive down
  integ: 0,
  p: 0, i: 0, d: 0, u: 0,
}

export const depthOf = (y: number) => TANK.waterY - y

export function resetAuv(y: number) {
  auv.depth = depthOf(y); auv.w = 0; auv.integ = 0; auv.u = 0
  auv.setpoint = Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, auv.depth < DEPTH_MIN ? 1 : auv.depth))
}

/** Advance one step. `vert` is the stick: +1 = up (Space / ▲), -1 = down (Shift / ▼). Returns world vy. */
export function stepAuv(y: number, vert: number, dt: number): number {
  auv.depth = depthOf(y)
  let u: number
  if (auv.hold) {
    auv.setpoint = Math.min(DEPTH_MAX, Math.max(DEPTH_MIN, auv.setpoint - vert * 1.1 * dt))
    const e = auv.setpoint - auv.depth
    auv.p = PID.kp * e
    auv.d = -PID.kd * auv.w // derivative on measurement: no kick when the setpoint jumps
    const raw = auv.p + PID.ki * auv.integ + auv.d
    if (Math.abs(raw) < PID.uMax) auv.integ = Math.max(-2, Math.min(2, auv.integ + e * dt)) // anti-windup
    auv.i = PID.ki * auv.integ
    u = Math.max(-PID.uMax, Math.min(PID.uMax, auv.p + auv.i + auv.d))
  } else {
    auv.p = auv.i = auv.d = 0
    u = -vert * PID.uMax
  }
  auv.u = u
  auv.w += (u + BUOYANCY - DRAG * auv.w) * dt
  // hard limits: surface and floor
  if (auv.depth <= 0.36 && auv.w < 0) auv.w = 0
  if (auv.depth >= TANK.waterY - TANK.floorY - 0.5 && auv.w > 0) auv.w = 0
  return -auv.w
}

/** Survey beacons on the tank floor (and one sunken easter egg). */
export const BEACONS = [
  { x: -48.5, z: -7 }, { x: -36, z: -6.5 }, { x: -41, z: 1.5 }, { x: -49, z: 6.5 }, { x: -35, z: 7.5 },
]
export const SUNKEN_PI = { x: -45.5, z: -2.5 }
export const ACOUSTIC_DEPTHS = [1, 2, 3]
