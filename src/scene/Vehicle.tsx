import { useCallback, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { useSim } from '../store'
import { live } from '../game/bus'
import { stepAuv, resetAuv } from '../game/auv'
import { useGame } from '../game/store'
import { toast } from '../game/toasts'
import { paintById, vehicleById, type VehicleId } from '../game/vehicles'
import { keys, pressed, useDriveKeys } from './keys'
import {
  approachPoint, robotState, stationLayout, NEAR_DIST, ARENA_RADIUS, PADS, TANK, inTank, TANK_DOCK,
  SECRET_ROOM, HIDDEN_QUAD, WORLD, ZONE_SPOTS, type Zone,
} from './layout'
import { RoverModel, CarModel, QuadModel, AuvModel } from './VehicleModels'

const q = new THREE.Quaternion()
const e = new THREE.Euler()
const tmp2 = new THREE.Vector2()
/** Hop launch speed for a fixed ~1.4 m apex at any gravity (keeps cars under the track's 2 m "ground" ceiling). */
export const HOP_APEX = 1.4
const hopSpeed = (gravity: number) => Math.sqrt(2 * Math.abs(gravity) * HOP_APEX)

export function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

const COLLIDERS: Record<VehicleId, { half: [number, number, number]; off: number; rest: number }> = {
  rover: { half: [0.72, 0.5, 0.78], off: 0.12, rest: 0.379 },
  car: { half: [0.42, 0.25, 0.9], off: 0.0, rest: 0.25 },
  quad: { half: [0.75, 0.15, 0.75], off: 0, rest: 0.15 },
  auv: { half: [0.32, 0.32, 0.95], off: 0, rest: 0.32 },
}

function zoneAt(x: number, z: number, y: number): Zone {
  const d = (p: { x: number; z: number }) => Math.hypot(p.x - x, p.z - z)
  if (inTank(x, z, 4.5)) return 'tank'
  if (x > ARENA_RADIUS + 4) return 'track'
  if (live.secretOpen && d(SECRET_ROOM) < 5) return 'secret'
  if (y > 4) return null
  if (d(PADS.planning) < PADS.planning.size * 0.78) return 'planning'
  if (d(PADS.cartpole) < 4.6) return 'cartpole'
  if (d(PADS.launch) < 5.4) return 'launch'
  if (d(PADS.weld) < 5.8) return 'weld'
  return null
}

export function Vehicle({ reducedMotion }: { reducedMotion: boolean }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const scale = useRef(1)
  const jumpPrev = useRef(false)
  const pending = useRef<null | { x: number; y: number; z: number; heading: number }>(null)
  const vehicle = useGame((s) => s.vehicle)
  const paint = paintById(useGame((s) => s.paint))

  const enabled = useCallback(() => {
    const s = useSim.getState()
    return !s.openStation && !s.openSheet
  }, [])
  useDriveKeys(enabled)

  const place = useCallback((t: { x: number; y: number; z: number; heading: number }) => {
    const rb = body.current
    if (!rb) return
    rb.setTranslation({ x: t.x, y: t.y, z: t.z }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    robotState.heading = t.heading
    robotState.speed = 0
    robotState.vel.set(0, 0)
    robotState.autopilot = null
    robotState.path = []
    robotState.teleportedAt = performance.now()
    if (!reducedMotion) scale.current = 0.05
  }, [reducedMotion])

  // vehicle swaps: physics settings + sensible placement
  useEffect(() => {
    const rb = body.current
    if (!rb) return
    const ctl = vehicleById(vehicle).control
    rb.setGravityScale(ctl === 'fly' || ctl === 'swim' ? 0 : 1, true)
    const p = rb.translation()
    if (pending.current) { place(pending.current); pending.current = null; return }
    if (ctl === 'swim') {
      if (!inTank(p.x, p.z)) { place({ x: (TANK.x0 + TANK.x1) / 2, y: -1.3, z: 0, heading: -Math.PI / 2 }); resetAuv(-1.3) } else resetAuv(p.y)
    } else if (inTank(p.x, p.z, 0.3)) {
      place({ ...TANK_DOCK, y: 1 })
    } else if (ctl === 'fly') {
      rb.setTranslation({ x: p.x, y: Math.max(p.y, 1.4), z: p.z }, true)
    } else {
      rb.setTranslation({ x: p.x, y: Math.min(p.y, 1.2), z: p.z }, true)
    }
    robotState.speed = 0
    robotState.vel.set(0, 0)
    if (!reducedMotion) scale.current = 0.05
  }, [vehicle, place, reducedMotion])

  useEffect(() => {
    if (window.__simlab) window.__simlab.place = (x, z, y = 0.8, h?: number) => place({ x, y, z, heading: h ?? robotState.heading })
    if (window.__simlab) (window.__simlab as any).driveTo = (x: number, z: number) => { robotState.path = []; robotState.autopilot = { x, z } }
  }, [place])

  // teleport requests from menu / terminal / hotkeys
  useEffect(
    () =>
      useSim.subscribe((s, prev) => {
        if (!s.teleport || s.teleport === prev.teleport || !body.current) return
        const id = s.teleport.id
        const g = useGame.getState()
        if (id.startsWith('zone:')) {
          const sp = ZONE_SPOTS[id.slice(5)]
          if (!sp) return
          if (id === 'zone:tank' && g.vehicle === 'auv') return
          const target = { ...sp, y: g.vehicle === 'quad' ? 1.6 : 0.8 }
          if (g.vehicle === 'auv') { pending.current = target; g.setVehicle('rover'); return }
          place(target)
          return
        }
        const t = id === 'home' ? { x: 0, z: 0, heading: Math.PI } : approachPoint(id as Parameters<typeof approachPoint>[0])
        const target = { ...t, y: g.vehicle === 'quad' ? 1.6 : 0.8 }
        if (g.vehicle === 'auv') { pending.current = target; g.setVehicle('rover'); return }
        place(target)
      }),
    [place],
  )

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const rb = body.current
    if (!rb) return
    const s = useSim.getState()
    const g = useGame.getState()
    const d = vehicleById(g.vehicle)
    const col = COLLIDERS[g.vehicle]
    const p = rb.translation()
    const v0 = rb.linvel()
    robotState.pos.set(p.x, p.y, p.z)
    const locked = !!(s.openStation || s.openSheet)

    // ---------- input ----------
    let dx = 0, dz = 0, vert = 0
    if (!locked) {
      if (keys.has('up')) dz -= 1
      if (keys.has('down')) dz += 1
      if (keys.has('left')) dx -= 1
      if (keys.has('right')) dx += 1
      dx += s.joystick.x
      dz += s.joystick.y
      if (keys.has('rise')) vert += 1
      if (keys.has('sink')) vert -= 1
      vert += s.ascend
    }
    // hop (ground vehicles, low gravity only): tap Space / the touch hop button. Edge-triggered so
    // holding Space on the F1TENTH still works as its handbrake once you land.
    const jumpPressed = !locked && (pressed.has('rise') || (s.ascend > 0.5 && !jumpPrev.current))
    pressed.delete('rise')
    jumpPrev.current = s.ascend > 0.5
    const grounded = p.y < col.rest + 0.08 && v0.y <= 0.1
    const canHop = g.lowGravity && (d.control === 'screen' || d.control === 'car')
    const hopV = canHop && jumpPressed && grounded ? hopSpeed(g.gravity) : 0
    if (hopV) live.hops++
    let mag = Math.min(1, Math.hypot(dx, dz))
    const manual = mag > 0.08
    if (manual) { robotState.autopilot = null; robotState.path = [] }
    let auto = false
    if (!manual && (robotState.autopilot || robotState.path.length)) {
      const ap = robotState.autopilot ?? robotState.path[0]
      const ex = ap.x - p.x, ez = ap.z - p.z
      const dist = Math.hypot(ex, ez)
      const last = !robotState.autopilot && robotState.path.length === 1
      if (dist < (robotState.autopilot || last ? 0.35 : 0.7)) {
        if (robotState.autopilot) {
          if (robotState.autopilot.open) s.open(robotState.autopilot.open)
          robotState.autopilot = null
        } else robotState.path.shift()
      } else { dx = ex; dz = ez; mag = Math.min(1, dist / (last || robotState.autopilot ? 1.5 : 0.8)); auto = true }
    }

    const ctl = auto && d.control === 'car' ? 'screen' : d.control
    let max = d.maxSpeed * (robotState.offTrack && d.control === 'car' ? 0.45 : 1)
    if (auto) max = Math.min(max, 6.5)
    let vy = 0
    const v = v0

    if (ctl === 'car') {
      // throttle/steer relative to the car; simple slip model for drifts
      const throttle = locked ? 0 : (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0) - s.joystick.y
      const steer = locked ? 0 : (keys.has('left') ? 1 : 0) - (keys.has('right') ? 1 : 0) - s.joystick.x
      const handbrake = !locked && keys.has('rise') && (!g.lowGravity || (grounded && !jumpPressed))
      const fwd = robotState.speed
      let acc = 0
      if (throttle > 0.05) acc = fwd < 0 ? 26 : 13 * throttle
      else if (throttle < -0.05) acc = fwd > 0.5 ? -26 : -8
      robotState.speed = THREE.MathUtils.clamp(fwd + acc * dt, -5, max)
      if (Math.abs(throttle) < 0.05) robotState.speed *= Math.exp(-1.2 * dt)
      if (robotState.speed > max) robotState.speed = THREE.MathUtils.damp(robotState.speed, max, 4, dt)
      const sp = robotState.speed
      const steerAuth = THREE.MathUtils.clamp(Math.abs(sp) / 3, 0, 1) * (1 - 0.45 * Math.min(1, Math.abs(sp) / d.maxSpeed))
      robotState.heading += THREE.MathUtils.clamp(steer, -1, 1) * 3.0 * steerAuth * Math.sign(sp || 1) * dt * (handbrake ? 1.5 : 1)
      const slip = Math.min(1, Math.abs(steer) * (Math.abs(sp) / d.maxSpeed) ** 2 * 1.6)
      const grip = handbrake ? 1.2 : THREE.MathUtils.lerp(11, 2.2, slip)
      tmp2.set(Math.sin(robotState.heading) * sp, Math.cos(robotState.heading) * sp)
      robotState.vel.lerp(tmp2, 1 - Math.exp(-grip * dt))
      if (handbrake) robotState.speed *= Math.exp(-1.5 * dt)
      vy = hopV || (g.lowGravity ? v.y : Math.min(v.y, 0))
    } else {
      let targetSpeed = 0
      if (mag > 0.08) {
        const desired = Math.atan2(dx, dz)
        const diff = angleDiff(robotState.heading, desired)
        const turn = ctl === 'fly' ? 12 : ctl === 'swim' ? 4 : 9
        robotState.heading += THREE.MathUtils.clamp(diff, -turn * dt, turn * dt)
        targetSpeed = max * mag * (ctl === 'fly' ? 1 : Math.max(0, Math.cos(diff)))
        if (ctl === 'fly') tmp2.set(dx / (Math.hypot(dx, dz) || 1), dz / (Math.hypot(dx, dz) || 1)).multiplyScalar(targetSpeed)
      }
      if (ctl === 'fly') {
        if (mag <= 0.08) tmp2.set(0, 0)
        robotState.vel.lerp(tmp2, 1 - Math.exp(-3.5 * dt))
        robotState.speed = robotState.vel.length()
        vy = vert * 4.5
        if (p.y > 14 && vy > 0) vy = 0
      } else {
        const k = ctl === 'swim' ? (targetSpeed > robotState.speed ? 2 : 2.5) : (targetSpeed > robotState.speed ? 9 : 18)
        robotState.speed = THREE.MathUtils.damp(robotState.speed, targetSpeed, k, dt)
        robotState.vel.set(Math.sin(robotState.heading) * robotState.speed, Math.cos(robotState.heading) * robotState.speed)
        if (ctl === 'swim') {
          vy = stepAuv(p.y, locked ? 0 : vert, dt)
          if ((p.y > TANK.waterY - 0.4 && vy > 0) || (p.y < TANK.floorY + 0.5 && vy < 0)) vy = 0
        } else if (g.lowGravity) {
          // low gravity: tap Space to hop, and you can land on props
          vy = hopV || v.y
        } else vy = Math.min(v.y, 0)
      }
    }
    rb.setLinvel({ x: robotState.vel.x, y: vy, z: robotState.vel.y }, true)
    q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, robotState.heading)
    rb.setRotation(q, true)

    // ---------- constraints ----------
    let { x, y, z } = p
    let fix = false
    if (ctl === 'swim') {
      if (!inTank(x, z)) { x = THREE.MathUtils.clamp(x, TANK.x0 + 1, TANK.x1 - 1); z = THREE.MathUtils.clamp(z, TANK.z0 + 1, TANK.z1 - 1); fix = true }
      if (y > TANK.waterY - 0.35) { y = TANK.waterY - 0.35; fix = true }
    } else if (ctl !== 'fly' && !g.lowGravity && !inTank(x, z, 0.2) && y > col.rest + 0.18) { y = col.rest; fix = true } // never ride up onto props
    if (ctl === 'fly' && inTank(x, z) && y < TANK.waterY + 0.2) {
      // splash! quadcopters don't swim
      fix = false
      place({ ...TANK_DOCK, y: 1.6 })
      toast('Splash!', 'Quadcopters don’t swim. Try the AUV in the tank.', 'warn')
    }
    if (x < WORLD.x0 || x > WORLD.x1 || z < WORLD.z0 || z > WORLD.z1) {
      x = THREE.MathUtils.clamp(x, WORLD.x0, WORLD.x1); z = THREE.MathUtils.clamp(z, WORLD.z0, WORLD.z1); fix = true
    }
    if (y < -8) { x = 0; y = 1; z = 0; fix = true }
    if (fix) rb.setTranslation({ x, y, z }, true)

    // ---------- visuals ----------
    if (visual.current) {
      scale.current = THREE.MathUtils.damp(scale.current, 1, 10, dt)
      visual.current.scale.setScalar(scale.current)
      if (!reducedMotion) {
        if (ctl === 'fly' || ctl === 'swim') {
          // bank into motion (local frame)
          const ch = Math.cos(robotState.heading), sh = Math.sin(robotState.heading)
          const lf = robotState.vel.x * sh + robotState.vel.y * ch
          const ll = robotState.vel.x * ch - robotState.vel.y * sh
          e.set(lf * (ctl === 'fly' ? 0.06 : 0.02) - vy * (ctl === 'swim' ? 0.12 : 0), 0, -ll * 0.06)
          visual.current.rotation.x = THREE.MathUtils.damp(visual.current.rotation.x, e.x, 6, dt)
          visual.current.rotation.z = THREE.MathUtils.damp(visual.current.rotation.z, e.z, 6, dt)
        } else {
          visual.current.rotation.z = 0
          visual.current.rotation.x = THREE.MathUtils.damp(visual.current.rotation.x, 0, 8, dt)
        }
      }
    }

    // ---------- proximity, zones, missions ----------
    let near: (typeof stationLayout)[number]['id'] | null = null
    if (Math.hypot(p.x, p.z) < ARENA_RADIUS && p.y < 4) {
      let best = NEAR_DIST
      for (const st of stationLayout) {
        const dd = Math.hypot(st.x - p.x, st.z - p.z)
        if (dd < best) { best = dd; near = st.id }
      }
    }
    if (near !== s.nearStation) s.setNear(near)
    const zone = zoneAt(p.x, p.z, p.y)
    if (zone !== s.zone) {
      s.setZone(zone)
      if (zone === 'tank') g.complete('tank')
      if (zone === 'secret') g.complete('secret')
    }
    if (!g.done.quad && Math.hypot(p.x - HIDDEN_QUAD.x, p.z - HIDDEN_QUAD.z) < 2.6) g.complete('quad')
    if (!g.done.loop && g.slam && g.mapped >= 0.3 && Math.hypot(p.x, p.z) < 1.8) g.complete('loop')
    if (window.__simlab) window.__simlab.robot = { x: p.x, y: p.y, z: p.z, heading: robotState.heading }
  })

  const c = COLLIDERS[vehicle]
  const mp = { body: paint.body, accent: paint.accent, reducedMotion }
  return (
    <RigidBody ref={body} position={[0, 0.6, 0]} colliders={false} lockRotations friction={0} linearDamping={0.5} ccd name="robot">
      <CuboidCollider key={vehicle} args={c.half} position={[0, c.off, 0]} density={6} friction={0} />
      <group ref={visual}>
        {vehicle === 'rover' && <RoverModel {...mp} />}
        {vehicle === 'car' && <CarModel {...mp} />}
        {vehicle === 'quad' && <QuadModel {...mp} />}
        {vehicle === 'auv' && <AuvModel {...mp} />}
      </group>
    </RigidBody>
  )
}
