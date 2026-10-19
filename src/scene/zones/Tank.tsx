import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { TANK, HIDDEN_QUAD, ARENA_RADIUS } from '../layout'
import { useGame } from '../../game/store'
import { QuadModel } from '../VehicleModels'
import TankLab from './TankLab'
import PumpHouse from './PumpHouse'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const waterVert = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x * 0.9 + uTime * 1.3) * 0.05 + sin(p.y * 1.3 - uTime * 1.1) * 0.04;
    p.z += w;
    vWave = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`
const waterFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vec2 g = vUv * vec2(20.0, 20.0);
    float c = sin(g.x * 1.7 + uTime * 0.8 + sin(g.y * 1.3 + uTime)) * sin(g.y * 1.9 - uTime * 0.7);
    float caust = smoothstep(0.55, 1.0, c);
    vec3 deep = vec3(0.02, 0.18, 0.32);
    vec3 col = deep + vec3(0.25, 0.75, 0.95) * caust * 0.35 + vWave * 1.5;
    gl_FragColor = vec4(col, 0.62);
  }
`

function Water({ reducedMotion }: { reducedMotion: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((_, dt) => { if (!reducedMotion) uniforms.uTime.value += dt })
  const w = TANK.x1 - TANK.x0, d = TANK.z1 - TANK.z0
  return (
    <mesh position={[(TANK.x0 + TANK.x1) / 2, TANK.waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d, 40, 40]} />
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={waterVert} fragmentShader={waterFrag} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

function Bubbles({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const n = 60
  const seeds = useMemo(() => Array.from({ length: n }, () => ({
    x: THREE.MathUtils.lerp(TANK.x0 + 1, TANK.x1 - 1, Math.random()),
    z: THREE.MathUtils.lerp(TANK.z0 + 1, TANK.z1 - 1, Math.random()),
    o: Math.random() * 4, s: 0.4 + Math.random() * 0.6,
  })), [])
  const m = useMemo(() => new THREE.Matrix4(), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = reducedMotion ? 0 : clock.elapsedTime
    seeds.forEach((b, i) => {
      const y = TANK.floorY + ((t * b.s + b.o) % 3.6)
      m.makeScale(0.05, 0.05, 0.05).setPosition(b.x + Math.sin(t + i) * 0.1, y, b.z)
      ref.current!.setMatrixAt(i, m)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#bae6fd" transparent opacity={0.5} />
    </instancedMesh>
  )
}

export default function Tank({ reducedMotion }: { reducedMotion: boolean }) {
  const T = TANK
  const cx = (T.x0 + T.x1) / 2, w = T.x1 - T.x0, d = T.z1 - T.z0, depth = -T.floorY
  const quadFound = useGame((s) => !!s.done.quad)
  const rail = useMemo(() => new THREE.Color('#38bdf8').multiplyScalar(1.8), [])
  return (
    <group>
      {/* path from the west gate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(-ARENA_RADIUS + T.x1) / 2, 0.004, 0]} receiveShadow>
        <planeGeometry args={[T.x1 + ARENA_RADIUS + 0.6, 4]} />
        <meshStandardMaterial color="#161d2a" roughness={0.9} />
      </mesh>
      {/* basin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, T.floorY + 0.01, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#0b3b4f" roughness={0.8} />
      </mesh>
      {[
        { p: [T.x0, T.floorY / 2, 0], r: [0, Math.PI / 2, 0], s: [d, depth] },
        { p: [T.x1, T.floorY / 2, 0], r: [0, -Math.PI / 2, 0], s: [d, depth] },
        { p: [cx, T.floorY / 2, T.z0], r: [0, 0, 0], s: [w, depth] },
        { p: [cx, T.floorY / 2, T.z1], r: [0, Math.PI, 0], s: [w, depth] },
      ].map((f, i) => (
        <mesh key={i} position={f.p as [number, number, number]} rotation={f.r as [number, number, number]}>
          <planeGeometry args={f.s as [number, number]} />
          <meshStandardMaterial color="#0e4a63" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Water reducedMotion={reducedMotion} />
      <Bubbles reducedMotion={reducedMotion} />
      <TankLab reducedMotion={reducedMotion} />
      {/* railing (visual; colliders live in Arena) */}
      {[
        [cx, T.z0 - 0.2, w + 0.4, 0.08], [cx, T.z1 + 0.2, w + 0.4, 0.08],
      ].map(([x, z, lx], i) => (
        <mesh key={i} position={[x, 1.0, z]}><boxGeometry args={[lx, 0.05, 0.08]} /><meshBasicMaterial color={rail} toneMapped={false} /></mesh>
      ))}
      {[T.x0 - 0.2, T.x1 + 0.2].map((x, i) => (
        <mesh key={i} position={[x, 1.0, 0]}><boxGeometry args={[0.08, 0.05, d + 0.4]} /><meshBasicMaterial color={rail} toneMapped={false} /></mesh>
      ))}
      <Text font={fontBold} position={[T.x1 + 1.5, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.9} letterSpacing={0.15} color="#7dd3fc" anchorX="center">
        TEST TANK
      </Text>
      <Text font={fontBold} position={[T.x1 + 2.6, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.3} letterSpacing={0.2} color="#38bdf8" anchorX="center">
        AUV ONLY · GARAGE → AUV
      </Text>
      {/* pump house, with a little something parked behind it */}
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[2.5, 1.6, 1.5]} position={[HIDDEN_QUAD.x, 1.6, HIDDEN_QUAD.z - 3]} /></RigidBody>
      <PumpHouse reducedMotion={reducedMotion} />
      {!quadFound && (
        <group position={[HIDDEN_QUAD.x, 0.2, HIDDEN_QUAD.z]}>
          <QuadModel body="#e8edf3" accent="#fbbf24" reducedMotion />
          <pointLight position={[0, 1, 0]} intensity={4} distance={4} color="#fbbf24" />
        </group>
      )}
    </group>
  )
}
