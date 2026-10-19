import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useSim } from '../store'
import { useCoarsePointer } from '../hooks'
import type { StationId } from '../data/content'
import { approachPoint, robotState, stationLayout } from './layout'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'
import fontMed from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff?url'

const glow = (hex: string, k = 2.2) => new THREE.Color(hex).multiplyScalar(k)

function HoloMaterial({ color, wire = false, opacity = 1 }: { color: string; wire?: boolean; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={wire ? 2.2 : 0.6}
      wireframe={wire}
      transparent={opacity < 1}
      opacity={opacity}
      roughness={0.3}
      metalness={0.2}
      toneMapped={!wire}
    />
  )
}

function Hologram({ id, color }: { id: StationId; color: string }) {
  const pts = useMemo(() => {
    if (id !== 'research') return null
    // point-cloud "scan" of a torus knot — a nod to 3D vision / SLAM work
    const g = new THREE.TorusKnotGeometry(0.55, 0.18, 120, 10)
    const arr = g.attributes.position.array as Float32Array
    const out = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i++) out[i] = arr[i] + (Math.random() - 0.5) * 0.04
    g.dispose()
    const bg = new THREE.BufferGeometry()
    bg.setAttribute('position', new THREE.BufferAttribute(out, 3))
    return bg
  }, [id])

  switch (id) {
    case 'about':
      return (
        <group>
          <mesh><icosahedronGeometry args={[0.75, 1]} /><HoloMaterial color={color} wire /></mesh>
          <mesh><sphereGeometry args={[0.38, 24, 24]} /><meshBasicMaterial color={glow(color, 1.6)} toneMapped={false} /></mesh>
        </group>
      )
    case 'experience': // rocket
      return (
        <group rotation={[0, 0, 0.25]}>
          <mesh><cylinderGeometry args={[0.22, 0.22, 1.0, 16]} /><meshStandardMaterial color="#e8edf3" roughness={0.3} /></mesh>
          <mesh position={[0, 0.68, 0]}><coneGeometry args={[0.22, 0.36, 16]} /><meshStandardMaterial color="#e8edf3" roughness={0.3} /></mesh>
          <mesh position={[0, 0.2, 0.2]}><circleGeometry args={[0.07, 16]} /><meshBasicMaterial color={glow(color, 2)} toneMapped={false} /></mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * 0.24, -0.4, Math.cos((i * Math.PI) / 2) * 0.24]}>
              <boxGeometry args={[0.03, 0.28, 0.2]} /><meshStandardMaterial color="#1b2230" />
            </mesh>
          ))}
          <mesh position={[0, -0.68, 0]}><coneGeometry args={[0.16, 0.45, 12, 1, true]} /><meshBasicMaterial color={glow(color, 3)} toneMapped={false} transparent opacity={0.85} side={THREE.DoubleSide} /></mesh>
        </group>
      )
    case 'projects': // robot arm
      return <Arm color={color} />
    case 'research':
      return (
        <points geometry={pts!}>
          <pointsMaterial color={glow(color, 2.5)} size={0.035} sizeAttenuation toneMapped={false} />
        </points>
      )
    case 'teaching': // graduation cap
      return (
        <group rotation={[0.25, 0, 0]}>
          <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.32, 0.36, 0.3, 20]} /><meshStandardMaterial color="#1b2230" roughness={0.5} /></mesh>
          <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[1.0, 0.05, 1.0]} /><meshStandardMaterial color="#1b2230" roughness={0.4} /></mesh>
          <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}><boxGeometry args={[1.02, 0.02, 1.02]} /><HoloMaterial color={color} wire /></mesh>
          <mesh position={[0.45, -0.12, 0.1]}><cylinderGeometry args={[0.012, 0.012, 0.36, 6]} /><meshBasicMaterial color={glow(color)} toneMapped={false} /></mesh>
          <mesh position={[0.45, -0.32, 0.1]}><sphereGeometry args={[0.05, 10, 10]} /><meshBasicMaterial color={glow(color)} toneMapped={false} /></mesh>
        </group>
      )
    case 'contact': // satellite dish
      return (
        <group rotation={[-0.5, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><sphereGeometry args={[0.6, 24, 12, 0, Math.PI * 2, 0, 0.9]} /><meshStandardMaterial color="#e8edf3" roughness={0.35} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.6, 6]} /><meshStandardMaterial color="#9aa6b5" /></mesh>
          <mesh position={[0, 0, 0.66]}><sphereGeometry args={[0.07, 12, 12]} /><meshBasicMaterial color={glow(color, 3)} toneMapped={false} /></mesh>
          <Waves color={color} />
        </group>
      )
  }
}

function Arm({ color }: { color: string }) {
  const j1 = useRef<THREE.Group>(null)
  const j2 = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (useSim.getState().mode !== '3d' || (window as any).__reduced) return
    const t = clock.elapsedTime
    if (j1.current) j1.current.rotation.z = Math.sin(t * 0.9) * 0.5 - 0.3
    if (j2.current) j2.current.rotation.z = Math.sin(t * 1.3 + 1) * 0.6 + 0.9
  })
  return (
    <group position={[0, -0.55, 0]}>
      <mesh><cylinderGeometry args={[0.28, 0.32, 0.16, 20]} /><meshStandardMaterial color="#1b2230" metalness={0.5} roughness={0.4} /></mesh>
      <group ref={j1} position={[0, 0.1, 0]}>
        <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.14, 0.8, 0.14]} /><meshStandardMaterial color="#e8edf3" roughness={0.35} /></mesh>
        <mesh><sphereGeometry args={[0.12, 16, 16]} /><meshBasicMaterial color={glow(color, 2.4)} toneMapped={false} /></mesh>
        <group ref={j2} position={[0, 0.8, 0]}>
          <mesh><sphereGeometry args={[0.1, 16, 16]} /><meshBasicMaterial color={glow(color, 2.4)} toneMapped={false} /></mesh>
          <mesh position={[0, 0.32, 0]}><boxGeometry args={[0.1, 0.64, 0.1]} /><meshStandardMaterial color="#e8edf3" roughness={0.35} /></mesh>
          <mesh position={[-0.06, 0.7, 0]}><boxGeometry args={[0.03, 0.14, 0.08]} /><meshStandardMaterial color="#1b2230" /></mesh>
          <mesh position={[0.06, 0.7, 0]}><boxGeometry args={[0.03, 0.14, 0.08]} /><meshStandardMaterial color="#1b2230" /></mesh>
        </group>
      </group>
    </group>
  )
}

function Waves({ color }: { color: string }) {
  const refs = useRef<THREE.Mesh[]>([])
  useFrame(({ clock }) => {
    if ((window as any).__reduced) return
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (clock.elapsedTime * 0.6 + i / 3) % 1
      m.position.z = 0.7 + t * 0.9
      m.scale.setScalar(0.4 + t * 1.2)
      ;(m.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.8
    })
  })
  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(m) => { if (m) refs.current[i] = m }} position={[0, 0, 0.7 + i * 0.3]}>
          <torusGeometry args={[0.2, 0.012, 6, 32]} />
          <meshBasicMaterial color={glow(color, 2.5)} toneMapped={false} transparent opacity={0.6} />
        </mesh>
      ))}
    </>
  )
}

/** Small keycap above the title: the number key that jumps to this station. */
function KeyBadge({ k, color }: { k: string; color: string }) {
  const edge = useMemo(() => new THREE.Color(color).multiplyScalar(1.6), [color])
  return (
    <group position={[0, 0.84, 0]}>
      <mesh position={[0, 0, -0.02]}><planeGeometry args={[0.36, 0.36]} /><meshBasicMaterial color={edge} toneMapped={false} /></mesh>
      <mesh position={[0, 0.012, -0.01]}><planeGeometry args={[0.31, 0.3]} /><meshBasicMaterial color="#0b1220" /></mesh>
      <Text font={fontBold} fontSize={0.21} anchorX="center" anchorY="middle" position={[0, 0.015, 0]} color="#f1f5f9">
        {k}
      </Text>
    </group>
  )
}

function Station({ s, reducedMotion }: { s: (typeof stationLayout)[number]; reducedMotion: boolean }) {
  const touch = useCoarsePointer()
  const holo = useRef<THREE.Group>(null)
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const [hover, setHover] = useState(false)
  const near = useSim((st) => st.nearStation === s.id)
  const open = useSim((st) => st.openStation === s.id)
  const base = useMemo(() => new THREE.Color(s.color), [s.color])

  useFrame(({ clock }, dt) => {
    if (holo.current && !reducedMotion) {
      holo.current.rotation.y += dt * 0.5
      holo.current.position.y = 2.15 + Math.sin(clock.elapsedTime * 1.2 + s.x) * 0.08
    }
    if (ring.current) {
      const target = near || open || hover ? 3.2 : 1.1
      const cur = ring.current.userData.k ?? 1.1
      const k = THREE.MathUtils.damp(cur, target, 6, dt)
      ring.current.userData.k = k
      ring.current.color.copy(base).multiplyScalar(k)
    }
  })

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const sim = useSim.getState()
    if (sim.nearStation === s.id) return sim.open(s.id)
    // drive there, then open
    const ap = approachPoint(s.id)
    robotState.autopilot = { x: ap.x, z: ap.z, open: s.id }
  }

  return (
    <group position={[s.x, 0, s.z]} rotation={[0, s.rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[0.6, 1.45]} position={[0, 0.6, 0]} />
      </RigidBody>
      <group
        onClick={onClick}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      >
        {/* pedestal */}
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.35, 1.5, 0.4, 6]} />
          <meshStandardMaterial color="#1a2130" roughness={0.45} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.41, 0]}>
          <cylinderGeometry args={[1.25, 1.25, 0.02, 6]} />
          <meshStandardMaterial color="#0c1018" roughness={0.15} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.425, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
          <ringGeometry args={[1.1, 1.18, 6]} />
          <meshBasicMaterial color={glow(s.color, 2)} toneMapped={false} />
        </mesh>
        {/* light beam */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.55, 0.9, 1.8, 24, 1, true]} />
          <meshBasicMaterial color={s.color} transparent opacity={near || hover ? 0.1 : 0.045} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* hologram */}
        <group ref={holo} position={[0, 2.15, 0]}>
          <Hologram id={s.id} color={s.color} />
        </group>
        {/* hit area so clicks are easy */}
        <mesh position={[0, 1.4, 0]} visible={false}>
          <cylinderGeometry args={[1.5, 1.5, 2.8, 8]} />
        </mesh>
      </group>
      {/* floor proximity ring */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.65, 64]} />
        <meshBasicMaterial ref={ring} color={s.color} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      {/* label */}
      <Billboard position={[0, 3.55, 0]}>
        <Text font={fontBold} fontSize={0.48} letterSpacing={0.02} anchorY="bottom" color="#f1f5f9" outlineWidth={0.004} outlineColor="#000">
          {s.label.toUpperCase()}
        </Text>
        <Text font={fontMed} fontSize={0.2} anchorY="top" position={[0, -0.06, 0]} color={s.color} letterSpacing={0.12}>
          {s.short.toUpperCase()}
        </Text>
        {!touch && <KeyBadge k={s.hotkey} color={s.color} />}
      </Billboard>
    </group>
  )
}

export function Stations({ reducedMotion }: { reducedMotion: boolean }) {
  return <>{stationLayout.map((s) => <Station key={s.id} s={s} reducedMotion={reducedMotion} />)}</>
}
