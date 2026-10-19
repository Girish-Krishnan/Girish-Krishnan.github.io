import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { SECRET_ROOM, ARENA_RADIUS, SECRET_SEG, WALL_SEGMENTS, robotState } from '../layout'
import { live } from '../../game/bus'
import { useSim } from '../../store'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'
import fontBody from '@fontsource/inter/files/inter-latin-400-normal.woff?url'

const W = SECRET_ROOM.w / 2, D = SECRET_ROOM.d / 2, HGT = 2.2, T = 0.2
const CORR = 1.5, CORR_END = 6.4
const CONFETTI = 140
const JOKES = [
  'My SLAM map is perfect.\nI just have no idea where I am on it.',
  'Heisenberg gets pulled over.\n“Do you know how fast you were going?”\n“No, but I know exactly where I am.”',
  'RRT*: because the first path\nis never the best path.',
  'A Kalman filter walks into a bar.\nIt was expecting that.',
]

/** Hidden room behind the flickering glass panel. Roof fades away and the lights come up when you enter. */
function RoomContent({ reducedMotion }: { reducedMotion: boolean }) {
  const roof = useRef<THREE.MeshStandardMaterial>(null)
  const lights = useRef<(THREE.PointLight | null)[]>([])
  const knot = useRef<THREE.Mesh>(null)
  const conf = useRef<THREE.InstancedMesh>(null)
  const st = useRef({ reveal: 0, burst: false, parts: [] as { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: number }[] })
  const neon = useMemo(() => new THREE.Color('#67e8f9').multiplyScalar(2.4), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const palette = useMemo(() => ['#5eead4', '#fbbf24', '#f472b6', '#a78bfa', '#f43f5e'].map((c) => new THREE.Color(c)), [])

  useEffect(() => { if (conf.current) conf.current.count = 0 }, [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    const inside = useSim.getState().zone === 'secret'
    s.reveal = reducedMotion ? (inside ? 1 : 0) : THREE.MathUtils.damp(s.reveal, inside ? 1 : 0, 3, dt)
    if (roof.current) { roof.current.opacity = 1 - s.reveal; roof.current.visible = s.reveal < 0.99 }
    lights.current.forEach((l) => { if (l) l.intensity = 14 * s.reveal })
    if (knot.current && !reducedMotion) knot.current.rotation.y += dt * 0.8
    if (inside && !s.burst && !reducedMotion && conf.current) {
      s.burst = true
      conf.current.count = CONFETTI
      s.parts = Array.from({ length: CONFETTI }, () => ({
        p: new THREE.Vector3((Math.random() - 0.5) * 2, 2.1, (Math.random() - 0.5) * 2),
        v: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 2, (Math.random() - 0.5) * 5),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), w: 2 + Math.random() * 6,
      }))
      for (let k = 0; k < CONFETTI; k++) conf.current.setColorAt(k, palette[k % palette.length])
      if (conf.current.instanceColor) conf.current.instanceColor.needsUpdate = true
    }
    if (s.parts.length && conf.current) {
      s.parts.forEach((pt, k) => {
        pt.v.y -= 3 * dt; pt.v.multiplyScalar(Math.exp(-1.5 * dt))
        pt.p.addScaledVector(pt.v, dt)
        if (pt.p.y < 0.03) { pt.p.y = 0.03; pt.v.set(0, 0, 0) } else { pt.r.x += pt.w * dt; pt.r.y += pt.w * 0.7 * dt }
        q.setFromEuler(pt.r)
        m4.compose(pt.p, q, one)
        conf.current!.setMatrixAt(k, m4)
      })
      conf.current.instanceMatrix.needsUpdate = true
    }
  })

  const wall = (x: number, z: number, sx: number, sz: number, key: string) => (
    <group key={key}>
      <CuboidCollider args={[sx / 2, HGT / 2, sz / 2]} position={[x, HGT / 2, z]} />
      <mesh position={[x, HGT / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[sx, HGT, sz]} />
        <meshStandardMaterial color="#1b2230" roughness={0.8} />
      </mesh>
    </group>
  )
  return (
    <group position={[SECRET_ROOM.x, 0, SECRET_ROOM.z]} rotation={[0, SECRET_ROOM.rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {wall(0, -D, W * 2 + T, T, 'back')}
        {wall(-W, 0, T, D * 2, 'l')}
        {wall(W, 0, T, D * 2, 'r')}
        {wall(-(W + CORR) / 2, D, W - CORR, T, 'fl')}
        {wall((W + CORR) / 2, D, W - CORR, T, 'fr')}
        {wall(-CORR, (D + CORR_END) / 2, T, CORR_END - D, 'cl')}
        {wall(CORR, (D + CORR_END) / 2, T, CORR_END - D, 'cr')}
      </RigidBody>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 2, D * 2]} />
        <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* roof hides the room from the overhead camera until you walk in */}
      <mesh position={[0, HGT + 0.02, (CORR_END - D) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 0.4, D * 2 + CORR_END - D + 0.2]} />
        <meshStandardMaterial ref={roof} color="#0a0e15" transparent roughness={1} />
      </mesh>
      {[-2.5, 2.5].map((x, i) => <pointLight key={x} ref={(l) => { lights.current[i] = l }} position={[x, 1.9, -0.5]} intensity={0} distance={9} color={i ? '#a78bfa' : '#67e8f9'} />)}
      <Text font={fontBold} position={[0, 1.55, -D + 0.12]} fontSize={0.42} letterSpacing={0.16} color={neon} anchorX="center" material-toneMapped={false}>ACCESS GRANTED</Text>
      <Text font={fontBold} position={[0, 1.15, -D + 0.12]} fontSize={0.2} letterSpacing={0.2} color="#94a3b8" anchorX="center">~/secret · you found the hidden room</Text>
      {/* trophy */}
      <mesh position={[0, 0.45, -1.4]} castShadow><cylinderGeometry args={[0.35, 0.42, 0.9, 20]} /><meshStandardMaterial color="#334155" /></mesh>
      <mesh ref={knot} position={[0, 1.25, -1.4]} castShadow>
        <torusKnotGeometry args={[0.22, 0.07, 96, 12, 2, 3]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} emissive="#7c4a03" emissiveIntensity={0.4} />
      </mesh>
      {/* jokes on the side walls */}
      {JOKES.map((j, i) => {
        const side = i < 2 ? -1 : 1
        const z = i % 2 ? 1.6 : -1.6
        return (
          <group key={i} position={[side * (W - 0.12), 1.25, z]} rotation={[0, (-side * Math.PI) / 2, 0]}>
            <mesh><planeGeometry args={[2.6, 1.3]} /><meshStandardMaterial color="#e5e7eb" roughness={0.9} /></mesh>
            <Text font={fontBody} position={[0, 0, 0.01]} fontSize={0.13} lineHeight={1.35} maxWidth={2.4} color="#1f2937" anchorX="center" anchorY="middle" textAlign="center">{j}</Text>
          </group>
        )
      })}
      {/* rubber duck debugging station */}
      <group position={[2.6, 0, -2.6]}>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.2, 0.08, 0.7]} /><meshStandardMaterial color="#475569" /></mesh>
        {[[-0.5, -0.28], [0.5, -0.28], [-0.5, 0.28], [0.5, 0.28]].map(([x, z], k) => <mesh key={k} position={[x, 0.2, z]}><boxGeometry args={[0.05, 0.4, 0.05]} /><meshStandardMaterial color="#334155" /></mesh>)}
        <mesh position={[0, 0.54, 0]} castShadow><sphereGeometry args={[0.13, 16, 12]} /><meshStandardMaterial color="#facc15" roughness={0.4} /></mesh>
        <mesh position={[0, 0.7, 0.04]} castShadow><sphereGeometry args={[0.08, 16, 12]} /><meshStandardMaterial color="#facc15" roughness={0.4} /></mesh>
        <mesh position={[0, 0.69, 0.12]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.035, 0.08, 8]} /><meshStandardMaterial color="#f97316" /></mesh>
        <Text font={fontBold} position={[0, 0.45, 0.36]} fontSize={0.07} color="#cbd5e1" anchorX="center">RUBBER DUCK DEBUGGING STATION</Text>
      </group>
      <instancedMesh ref={conf} args={[undefined, undefined, CONFETTI]} frustumCulled={false}>
        <planeGeometry args={[0.07, 0.04]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}

/**
 * Visibility gate: the room only exists (render + colliders) while the vehicle is inside the lab
 * near the glitching panel, or inside the room having come through it. From anywhere else,
 * including outside the lab, there is nothing to see or bump into.
 */
export default function SecretRoom({ reducedMotion }: { reducedMotion: boolean }) {
  const [show, setShow] = useState(false)
  const shown = useRef(false)
  const pa = (SECRET_SEG / WALL_SEGMENTS) * Math.PI * 2
  const panel = { x: Math.cos(pa) * ARENA_RADIUS, z: Math.sin(pa) * ARENA_RADIUS }
  const c = Math.cos(SECRET_ROOM.rotY), sn = Math.sin(SECRET_ROOM.rotY)
  useFrame(() => {
    const P = robotState.pos
    const r = Math.hypot(P.x, P.z)
    const nearPanel = r < ARENA_RADIUS + 0.3 && Math.hypot(P.x - panel.x, P.z - panel.z) < 9
    // vehicle position in the room's local frame
    const dx = P.x - SECRET_ROOM.x, dz = P.z - SECRET_ROOM.z
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c
    const inRegion = Math.abs(lx) < W + 0.6 && lz > -D - 0.6 && lz < CORR_END + 0.8
    const next = nearPanel || (inRegion && shown.current)
    if (next !== shown.current) { shown.current = next; live.secretOpen = next; setShow(next) }
  })
  return show ? <RoomContent reducedMotion={reducedMotion} /> : null
}
