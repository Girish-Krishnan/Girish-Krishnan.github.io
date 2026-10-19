import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { PADS } from '../layout'
import { on, useFeature, live } from '../../game/bus'
import { useGame } from '../../game/store'
import { toast } from '../../game/toasts'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const PAD = PADS.launch
export const HATCH_Y = 16
const PUFFS = 40

/** `launch`: countdown, liftoff through a ceiling hatch, then a propulsive landing back on the pad. */
export default function LaunchPad({ reducedMotion }: { reducedMotion: boolean }) {
  const rocket = useRef<THREE.Group>(null)
  const flame = useRef<THREE.Mesh>(null)
  const doorL = useRef<THREE.Mesh>(null)
  const doorR = useRef<THREE.Mesh>(null)
  const puffs = useRef<THREE.InstancedMesh>(null)
  const hatch = useRef<THREE.Group>(null)
  const st = useRef({ state: 'idle' as 'idle' | 'countdown' | 'flying' | 'landing', t: 0, y: 0, v: 0, lastCount: -1, puff: Array.from({ length: PUFFS }, () => ({ x: 0, y: -10, z: 0, s: 0, life: 0 })), nextPuff: 0 })
  const setF = useFeature((s) => s.set)
  const flameC = useMemo(() => new THREE.Color('#fdba74').multiplyScalar(3), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])

  useEffect(() => on('launch:go', () => {
    const s = st.current
    if (s.state !== 'idle') { toast('Range is not clear', 'Wait for the booster to land.'); return }
    s.state = 'countdown'; s.t = 0; s.lastCount = -1
    setF('launch', { state: 'countdown', t: 0 })
  }), [setF])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const s = st.current
    live.launching = s.state !== 'idle'
    if (hatch.current) hatch.current.visible = s.state !== 'idle'
    if (s.state === 'idle') { if (flame.current) flame.current.visible = false; live.rocketY = 0; return }
    s.t += dt
    let open = 0
    if (s.state === 'countdown') {
      const n = 3 - Math.floor(s.t)
      if (n !== s.lastCount && n > 0) { s.lastCount = n; setF('launch', { t: n }) }
      open = Math.max(0, s.t - 2)
      if (s.t >= 3) {
        s.state = 'flying'; s.t = 0; s.y = 0; s.v = 0
        setF('launch', { state: 'flying', t: 0 })
        useGame.getState().complete('liftoff')
      }
    } else if (s.state === 'flying') {
      s.v += 7 * dt; s.y += s.v * dt
      open = s.y < HATCH_Y + 6 ? 1 : Math.max(0, 1 - (s.y - HATCH_Y - 6) / 6)
      if (s.y > 70) { s.state = 'landing'; s.t = 0; s.y = 45; s.v = -14; setF('launch', { state: 'landing' }) }
    } else if (s.state === 'landing') {
      // suicide burn: decelerate to touch down softly
      const h = Math.max(0.01, s.y)
      const a = (s.v * s.v) / (2 * h)
      if (s.y < 30) s.v += a * dt
      s.v = Math.min(s.v, -0.6)
      s.y += s.v * dt
      open = s.y < HATCH_Y + 8 && s.y > HATCH_Y - 6 ? 1 : 0
      if (s.y <= 0) { s.y = 0; s.state = 'idle'; setF('launch', { state: 'idle' }); toast('Booster landed', 'Same booster, ready to fly again.') }
    }
    if (rocket.current) rocket.current.position.y = s.y
    live.rocketY = s.y
    if (flame.current) {
      const burning = s.state === 'flying' || (s.state === 'landing' && s.y < 30)
      flame.current.visible = burning
      flame.current.scale.set(1, (reducedMotion ? 1 : 0.85 + Math.random() * 0.3) * (s.state === 'flying' ? 1.6 : 1), 1)
    }
    if (doorL.current && doorR.current) {
      const cur = doorL.current.position.x
      const want = -1.1 - open * 2.2
      const nx = reducedMotion ? want : THREE.MathUtils.damp(cur, want, 5, dt)
      doorL.current.position.x = nx; doorR.current.position.x = -nx
    }
    // exhaust puffs
    if (puffs.current && !reducedMotion) {
      const burning = (s.state === 'flying' && s.y < 12) || (s.state === 'landing' && s.y < 6) || (s.state === 'countdown' && s.t > 2.2)
      if (burning) {
        const p = s.puff[s.nextPuff]; s.nextPuff = (s.nextPuff + 1) % PUFFS
        const a = Math.random() * Math.PI * 2
        p.x = Math.cos(a) * 0.3; p.z = Math.sin(a) * 0.3; p.y = 0.3; p.s = 0.2; p.life = 1
        ;(p as any).vx = Math.cos(a) * (2 + Math.random() * 2); (p as any).vz = Math.sin(a) * (2 + Math.random() * 2)
      }
      s.puff.forEach((p, k) => {
        if (p.life > 0) { p.life -= dt * 0.6; p.x += ((p as any).vx ?? 0) * dt; p.z += ((p as any).vz ?? 0) * dt; p.y += dt * 0.5; p.s += dt * 0.55 }
        const sc = p.life > 0 ? p.s : 0
        m4.makeScale(sc, sc, sc).setPosition(p.x, p.y, p.z)
        puffs.current!.setMatrixAt(k, m4)
      })
      puffs.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group position={[PAD.x, 0, PAD.z]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 0.9]} position={[0, 0.6, 0]} />
        <CylinderCollider args={[2.5, 0.35]} position={[-2.1, 2.5, 0]} />
      </RigidBody>
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[2.4, 2.5, 0.08, 40]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.3, 40]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* tower */}
      <group position={[-2.1, 0, 0]}>
        {[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].map(([x, z], i) => (
          <mesh key={i} position={[x, 2.6, z]} castShadow><boxGeometry args={[0.08, 5.2, 0.08]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></mesh>
        ))}
        {[0.8, 1.8, 2.8, 3.8, 4.8].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[0.58, 0.05, 0.58]} /><meshStandardMaterial color="#64748b" /></mesh>)}
        <mesh position={[0.9, 4.2, 0]}><boxGeometry args={[1.3, 0.08, 0.12]} /><meshStandardMaterial color="#64748b" /></mesh>
      </group>
      {/* rocket */}
      <group ref={rocket}>
        <group position={[0, 0.6, 0]}>
          <mesh position={[0, 2.1, 0]} castShadow><cylinderGeometry args={[0.32, 0.32, 3.6, 24]} /><meshStandardMaterial color="#f1f5f9" roughness={0.35} metalness={0.2} /></mesh>
          <mesh position={[0, 3.1, 0]}><cylinderGeometry args={[0.325, 0.325, 0.18, 24]} /><meshStandardMaterial color="#0f172a" /></mesh>
          <mesh position={[0, 4.25, 0]} castShadow><coneGeometry args={[0.32, 0.7, 24]} /><meshStandardMaterial color="#f1f5f9" roughness={0.35} /></mesh>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[Math.cos((k * Math.PI) / 2) * 0.42, 0.55, Math.sin((k * Math.PI) / 2) * 0.42]} rotation={[0, -(k * Math.PI) / 2, 0]} castShadow>
              <boxGeometry args={[0.28, 0.6, 0.04]} /><meshStandardMaterial color="#0f172a" />
            </mesh>
          ))}
          <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.2, 0.3, 0.3, 16]} /><meshStandardMaterial color="#1e293b" metalness={0.8} /></mesh>
          <mesh ref={flame} position={[0, -0.6, 0]} rotation={[Math.PI, 0, 0]} visible={false}>
            <coneGeometry args={[0.26, 1.4, 16, 1, true]} />
            <meshBasicMaterial color={flameC} toneMapped={false} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <Text font={fontBold} position={[0, 2.1, 0.33]} rotation={[0, 0, Math.PI / 2]} fontSize={0.2} letterSpacing={0.3} color="#0f172a" anchorX="center" anchorY="middle">SIM LAB</Text>
        </group>
      </group>
      <instancedMesh ref={puffs} args={[undefined, undefined, PUFFS]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.35} roughness={1} depthWrite={false} />
      </instancedMesh>
      {/* ceiling hatch */}
      <group ref={hatch} position={[0, HATCH_Y, 0]} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.8, 9, 48]} /><meshBasicMaterial color="#64748b" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[2.3, 2.8, 40]} /><meshStandardMaterial color="#334155" side={THREE.DoubleSide} /></mesh>
        <mesh ref={doorL} position={[-1.1, 0, 0]}><boxGeometry args={[2.2, 0.1, 4.4]} /><meshStandardMaterial color="#1e293b" metalness={0.5} /></mesh>
        <mesh ref={doorR} position={[1.1, 0, 0]}><boxGeometry args={[2.2, 0.1, 4.4]} /><meshStandardMaterial color="#1e293b" metalness={0.5} /></mesh>
      </group>
      <Text font={fontBold} position={[0, 0.1, 3.0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.36} letterSpacing={0.14} color="#f59e0b" anchorX="center">{'LAUNCH PAD · TYPE `launch`'}</Text>
    </group>
  )
}
