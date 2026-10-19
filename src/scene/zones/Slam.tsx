import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { robotState, ARENA_RADIUS } from '../layout'
import { cellOf, observe, coverage, occ, OCC } from '../../algos/occupancy'
import { useGame } from '../../game/store'

const MAX = 14000
const RAYS = 40
const RANGE = 14

/** Simulated 2D LiDAR: raycasts against the physics world and fills an occupancy grid + 3D point cloud. */
export default function Slam() {
  const { world, rapier } = useRapier()
  const pts = useMemo(() => new Float32Array(MAX * 3), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    g.setDrawRange(0, 0)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200)
    return g
  }, [pts])
  const st = useRef({ head: 0, count: 0, frame: 0, lastSync: 0, lastTrail: 0 })
  const color = useMemo(() => new THREE.Color('#5eead4').multiplyScalar(2.2), [])
  const ray = useMemo(() => new rapier.Ray({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }), [rapier])

  useFrame(({ clock }) => {
    const s = st.current
    const P = robotState.pos
    if (Math.hypot(P.x, P.z) > ARENA_RADIUS + 1 || P.y > 3 || P.y < -0.5) return
    s.frame++
    const base = s.frame * 0.137
    for (let i = 0; i < RAYS; i++) {
      const a = base + (i * Math.PI * 2) / RAYS
      const dx = Math.sin(a), dz = Math.cos(a)
      ray.origin = { x: P.x + dx * 0.95, y: 0.5, z: P.z + dz * 0.95 }
      ray.dir = { x: dx, y: 0, z: dz }
      const hit = world.castRay(ray, RANGE, true)
      const toi = hit ? hit.timeOfImpact : RANGE
      for (let t = 0; t < toi - 0.25; t += OCC.res * 0.8) observe(cellOf(ray.origin.x + dx * t, ray.origin.z + dz * t), false)
      if (hit) {
        const hx = ray.origin.x + dx * toi, hz = ray.origin.z + dz * toi
        observe(cellOf(hx + dx * 0.1, hz + dz * 0.1), true)
        const k = s.head * 3
        pts[k] = hx; pts[k + 1] = 0.12 + Math.random() * 0.9; pts[k + 2] = hz
        s.head = (s.head + 1) % MAX
        s.count = Math.min(MAX, s.count + 1)
      }
    }
    geo.attributes.position.needsUpdate = true
    geo.setDrawRange(0, s.count)
    occ.version++
    const t = clock.elapsedTime
    if (t - s.lastTrail > 0.25) { s.lastTrail = t; occ.trail.push([P.x, P.z]); if (occ.trail.length > 600) occ.trail.shift() }
    if (t - s.lastSync > 0.5) {
      s.lastSync = t
      const c = Math.round(coverage() * 100) / 100
      const g = useGame.getState()
      if (c > g.mapped) { g.set({ mapped: c }); if (c >= 0.8) g.complete('mapper') }
    }
  })

  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.08} color={color} toneMapped={false} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  )
}
