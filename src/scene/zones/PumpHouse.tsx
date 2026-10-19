import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { HIDDEN_QUAD } from '../layout'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

/** Pump house next to the AUV tank: a small plant room with pipes feeding the basin. */
const CX = HIDDEN_QUAD.x, CZ = HIDDEN_QUAD.z - 3 // body: 5 (x) × 3.2 (y) × 3 (z)
const EAST = CX + 2.5, SOUTH = CZ - 1.5

type V3 = [number, number, number]
const v = (p: V3) => new THREE.Vector3(...p)

/** A pipe run along a polyline: cylinders with ball joints and a flange at each end. */
function Pipe({ pts, r = 0.14, color = '#64748b' }: { pts: V3[]; r?: number; color?: string }) {
  const segs = useMemo(() => pts.slice(1).map((p, i) => {
    const a = v(pts[i]), b = v(p)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const len = a.distanceTo(b)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    return { mid, len, q }
  }), [pts])
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.q} castShadow>
          <cylinderGeometry args={[r, r, s.len, 16]} />
          <meshStandardMaterial color={color} metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {pts.slice(1, -1).map((p, i) => (
        <mesh key={'j' + i} position={p}><sphereGeometry args={[r * 1.08, 14, 10]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.35} /></mesh>
      ))}
      {[0, pts.length - 1].map((k) => {
        const s = segs[k === 0 ? 0 : segs.length - 1]
        return (
          <mesh key={'f' + k} position={pts[k]} quaternion={s.q}><cylinderGeometry args={[r * 1.45, r * 1.45, 0.08, 18]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} /></mesh>
        )
      })}
    </group>
  )
}

/** Handwheel valve sitting on top of a horizontal pipe. */
function Valve({ at, color }: { at: V3; color: string }) {
  return (
    <group position={at}>
      <mesh><cylinderGeometry args={[0.2, 0.2, 0.34, 16]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.035, 0.3, 8]} /><meshStandardMaterial color="#94a3b8" metalness={0.8} /></mesh>
      <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.035, 8, 24]} /><meshStandardMaterial color={color} roughness={0.5} /></mesh>
      {[0, Math.PI / 2].map((a) => (
        <mesh key={a} position={[0, 0.46, 0]} rotation={[0, a, 0]}><boxGeometry args={[0.4, 0.03, 0.03]} /><meshStandardMaterial color={color} /></mesh>
      ))}
    </group>
  )
}

/** Round pressure gauge with a needle that breathes with the pump. */
function Gauge({ at, phase, reducedMotion }: { at: V3; phase: number; reducedMotion: boolean }) {
  const needle = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!needle.current) return
    const t = reducedMotion ? 0 : clock.elapsedTime
    needle.current.rotation.z = 0.4 - 0.35 * Math.sin(t * 1.7 + phase) - 0.08 * Math.sin(t * 9 + phase)
  })
  return (
    <group position={at} rotation={[0, Math.PI / 2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.26, 0.26, 0.06, 28]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0, 0.032]}><circleGeometry args={[0.22, 28]} /><meshBasicMaterial color="#f1f5f9" /></mesh>
      <mesh position={[0, 0, 0.034]}><ringGeometry args={[0.15, 0.2, 28, 1, -0.6, 1.0]} /><meshBasicMaterial color="#ef4444" /></mesh>
      <mesh position={[0, 0, 0.034]}><ringGeometry args={[0.15, 0.2, 28, 1, 0.4, 2.2]} /><meshBasicMaterial color="#22c55e" /></mesh>
      <mesh ref={needle} position={[0, 0, 0.04]}>
        <planeGeometry args={[0.025, 0.36]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0, 0, 0.045]}><circleGeometry args={[0.03, 12]} /><meshBasicMaterial color="#0f172a" /></mesh>
    </group>
  )
}

/** Faint motes drifting up out of the roof vent (the hum, made visible). */
function Hum({ reducedMotion }: { reducedMotion: boolean }) {
  const n = 24
  const ref = useRef<THREE.Points>(null)
  const seeds = useMemo(() => Array.from({ length: n }, () => ({ a: Math.random() * Math.PI * 2, r: 0.15 + Math.random() * 0.3, o: Math.random() * 3, s: 0.35 + Math.random() * 0.3 })), [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    return g
  }, [])
  const col = useMemo(() => new THREE.Color('#5eead4').multiplyScalar(1.6), [])
  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute
    seeds.forEach((s, i) => {
      const k = (t * s.s + s.o) % 3
      pos.setXYZ(i, Math.cos(s.a + k) * s.r * (1 + k * 0.4), k * 0.9, Math.sin(s.a + k) * s.r * (1 + k * 0.4))
    })
    pos.needsUpdate = true
  })
  if (reducedMotion) return null
  return (
    <points ref={ref} geometry={geo} position={[CX - 1, 3.85, CZ + 0.3]}>
      <pointsMaterial color={col} size={0.07} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
    </points>
  )
}

export default function PumpHouse({ reducedMotion }: { reducedMotion: boolean }) {
  const lamp = useRef<THREE.MeshBasicMaterial>(null)
  const light = useRef<THREE.PointLight>(null)
  const fan = useRef<THREE.Group>(null)
  const green = useMemo(() => new THREE.Color('#4ade80'), [])
  const stripe = useMemo(() => new THREE.Color('#fbbf24').multiplyScalar(1.4), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const k = reducedMotion ? 1 : 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3))
    if (lamp.current) lamp.current.color.copy(green).multiplyScalar(1 + 2.2 * k)
    if (light.current) light.current.intensity = 1.2 * k
    if (fan.current && !reducedMotion) fan.current.rotation.y += dt * 6
  })
  // pipes: intake (low) and return (high) running from the east wall over the tank lip into the water
  const intake: V3[] = [[EAST, 0.55, CZ - 0.7], [-50.6, 0.55, CZ - 0.7], [-50.6, 0.55, 9.55], [-50.6, -1.6, 9.55]]
  const ret: V3[] = [[EAST, 1.35, CZ - 0.1], [-48.8, 1.35, CZ - 0.1], [-48.8, 1.35, 9.55], [-48.8, -0.9, 9.55]]
  return (
    <group>
      {/* body: concrete-ish walls with a darker plinth and roof cap */}
      <mesh position={[CX, 1.6, CZ]} castShadow receiveShadow>
        <boxGeometry args={[5, 3.2, 3]} /><meshStandardMaterial color="#3b4a5e" roughness={0.75} metalness={0.15} />
      </mesh>
      <mesh position={[CX, 0.15, CZ]}><boxGeometry args={[5.12, 0.3, 3.12]} /><meshStandardMaterial color="#1e293b" roughness={0.9} /></mesh>
      <mesh position={[CX, 3.25, CZ]}><boxGeometry args={[5.3, 0.12, 3.3]} /><meshStandardMaterial color="#1e293b" roughness={0.6} /></mesh>
      {/* hazard stripe along the roof edge */}
      <mesh position={[EAST + 0.01, 3.05, CZ]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[3, 0.08]} /><meshBasicMaterial color={stripe} toneMapped={false} /></mesh>
      <mesh position={[CX, 3.05, SOUTH - 0.01]} rotation={[0, Math.PI, 0]}><planeGeometry args={[5, 0.08]} /><meshBasicMaterial color={stripe} toneMapped={false} /></mesh>

      {/* east face: door, PUMP sign, status lamp, gauges */}
      <mesh position={[EAST + 0.01, 1.1, CZ + 0.75]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 1.9]} /><meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[EAST + 0.03, 1.05, CZ + 0.42]}><boxGeometry args={[0.05, 0.06, 0.18]} /><meshStandardMaterial color="#cbd5e1" metalness={0.9} /></mesh>
      <mesh position={[EAST + 0.02, 2.55, CZ - 0.3]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.5, 0.5]} /><meshStandardMaterial color="#0f172a" />
      </mesh>
      <Text font={fontBold} position={[EAST + 0.04, 2.55, CZ - 0.3]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} letterSpacing={0.25} color="#fbbf24" anchorX="center" anchorY="middle" material-toneMapped={false}>
        PUMP
      </Text>
      <group position={[EAST + 0.05, 2.55, CZ + 0.95]}>
        <mesh><sphereGeometry args={[0.1, 16, 12]} /><meshBasicMaterial ref={lamp} color={green} toneMapped={false} /></mesh>
        <mesh position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.14, 0.14, 0.04, 16]} /><meshStandardMaterial color="#111827" /></mesh>
        <pointLight ref={light} color="#4ade80" intensity={1.2} distance={3.5} />
      </group>
      <Gauge at={[EAST + 0.05, 1.75, CZ - 0.7]} phase={0} reducedMotion={reducedMotion} />
      <Gauge at={[EAST + 0.05, 1.75, CZ - 0.05]} phase={1.9} reducedMotion={reducedMotion} />

      {/* south face (towards the tank): louvred vent and a junction box */}
      <group position={[CX - 0.9, 1.7, SOUTH - 0.02]}>
        <mesh><planeGeometry args={[1.6, 1.1]} /><meshStandardMaterial color="#111827" side={THREE.DoubleSide} /></mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} position={[0, 0.42 - i * 0.17, -0.05]} rotation={[-0.6, 0, 0]}><boxGeometry args={[1.5, 0.12, 0.02]} /><meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} /></mesh>
        ))}
      </group>
      <mesh position={[CX + 1.4, 1.5, SOUTH - 0.1]}><boxGeometry args={[0.6, 0.75, 0.2]} /><meshStandardMaterial color="#475569" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[CX + 1.4, 1.6, SOUTH - 0.21]}><planeGeometry args={[0.22, 0.2]} /><meshBasicMaterial color="#fbbf24" side={THREE.DoubleSide} /></mesh>

      {/* roof: mushroom vent with a spinning fan, and the hum */}
      <group position={[CX - 1, 3.3, CZ + 0.3]}>
        <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.38, 0.42, 0.5, 20]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} /></mesh>
        <group ref={fan} position={[0, 0.52, 0]}>
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} rotation={[0.35, (k * Math.PI) / 2, 0]} position={[Math.cos((k * Math.PI) / 2) * 0.16, 0, -Math.sin((k * Math.PI) / 2) * 0.16]}><boxGeometry args={[0.3, 0.02, 0.1]} /><meshStandardMaterial color="#94a3b8" metalness={0.7} /></mesh>
          ))}
        </group>
        <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.55, 0.5, 0.08, 20]} /><meshStandardMaterial color="#334155" metalness={0.5} /></mesh>
      </group>
      <Hum reducedMotion={reducedMotion} />

      {/* pipes into the tank, with valves and support stands */}
      <Pipe pts={intake} color="#0e7490" />
      <Pipe pts={ret} r={0.11} color="#64748b" />
      <Valve at={[EAST + 1.0, 0.55 + 0.1, CZ - 0.7]} color="#ef4444" />
      <Valve at={[EAST + 1.6, 1.35 + 0.08, CZ - 0.1]} color="#3b82f6" />
      {[[EAST + 2.4, CZ - 0.7, 0.55], [-50.6, 10.6, 0.55], [EAST + 2.9, CZ - 0.1, 1.35], [-48.8, 10.6, 1.35]].map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}><boxGeometry args={[0.12, h, 0.12]} /><meshStandardMaterial color="#334155" metalness={0.5} /></mesh>
      ))}
      {/* flow arrows painted on the deck */}
      <Text font={fontBold} position={[-51.8, 0.02, CZ - 0.7 + 0.45]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} letterSpacing={0.2} color="#22d3ee" anchorX="center">
        {'INTAKE →'}
      </Text>
    </group>
  )
}
