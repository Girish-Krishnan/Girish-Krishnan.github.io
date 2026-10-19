import { useMemo, useRef } from 'react'
import { Graffiti } from './Graffiti'
import { Grid, RoundedBox, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { ARENA_RADIUS, WALL_SEGMENTS, GATE_EAST, GATE_WEST, SECRET_SEG, TANK, WORLD } from './layout'
import { robotState } from './layout'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'
import fontMed from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff?url'

// outer floor with a hole where the sunken test tank is
const outerFloorGeo = (() => {
  const sh = new THREE.Shape()
  sh.moveTo(-220, -160); sh.lineTo(220, -160); sh.lineTo(220, 160); sh.lineTo(-220, 160); sh.lineTo(-220, -160)
  const h = new THREE.Path()
  h.moveTo(TANK.x0, -TANK.z1); h.lineTo(TANK.x0, -TANK.z0); h.lineTo(TANK.x1, -TANK.z0); h.lineTo(TANK.x1, -TANK.z1); h.lineTo(TANK.x0, -TANK.z1)
  sh.holes.push(h)
  return new THREE.ShapeGeometry(sh)
})()

function Gate({ seg, label, outside, color }: { seg: number; label: string; outside: string; color: string }) {
  const a = (seg / WALL_SEGMENTS) * Math.PI * 2
  const x = Math.cos(a) * ARENA_RADIUS, z = Math.sin(a) * ARENA_RADIUS
  const len = 2 * ARENA_RADIUS * Math.tan(Math.PI / WALL_SEGMENTS)
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(2.2), [color])
  return (
    <group position={[x, 0, z]} rotation={[0, -a + Math.PI / 2, 0]}>
      <RigidBody type="fixed" colliders={false}>
        {[-1, 1].map((sx) => <CuboidCollider key={sx} args={[0.25, 2, 0.25]} position={[(sx * len) / 2, 2, 0]} />)}
      </RigidBody>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * len) / 2, 2, 0]} castShadow>
          <boxGeometry args={[0.4, 4, 0.4]} /><meshStandardMaterial color="#1a2130" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 4.1, 0]}><boxGeometry args={[len + 0.4, 0.35, 0.4]} /><meshStandardMaterial color="#1a2130" metalness={0.5} roughness={0.4} /></mesh>
      {/* sign plate on the beam: one label per face, each pushed off its face and front-side only,
          so the far label is hidden by the plate instead of bleeding through mirrored */}
      <mesh position={[0, 4.75, 0]}><boxGeometry args={[len - 0.8, 0.75, 0.16]} /><meshStandardMaterial color="#0f1520" metalness={0.4} roughness={0.5} /></mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 0.21]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
          <mesh position={[0, 3.9, 0]}><boxGeometry args={[len - 0.4, 0.05, 0.02]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
          <Text font={fontBold} position={[0, 4.75, -0.12]} fontSize={0.42} letterSpacing={0.12} color={color} anchorX="center" anchorY="middle" material-side={THREE.FrontSide} material-toneMapped={false}>
            {side < 0 ? label : outside}
          </Text>
        </group>
      ))}
    </group>
  )
}

function Walls() {
  const segs = useMemo(() => {
    const out: { i: number; x: number; z: number; rot: number; len: number }[] = []
    const len = 2 * ARENA_RADIUS * Math.tan(Math.PI / WALL_SEGMENTS) + 0.05
    for (let i = 0; i < WALL_SEGMENTS; i++) {
      if (i === GATE_EAST || i === GATE_WEST) continue
      const a = (i / WALL_SEGMENTS) * Math.PI * 2
      out.push({ i, x: Math.cos(a) * ARENA_RADIUS, z: Math.sin(a) * ARENA_RADIUS, rot: -a + Math.PI / 2, len })
    }
    return out
  }, [])
  const edge = useMemo(() => new THREE.Color('#7dd3fc').multiplyScalar(1.6), [])
  const glitch = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    // the secret panel's edge flickers now and then: a hint
    if (!glitch.current) return
    const t = clock.elapsedTime
    const on = Math.sin(t * 13) > 0.6 && Math.sin(t * 0.7) > 0.2
    glitch.current.color.setRGB(on ? 0.2 : 0.49 * 1.6, on ? 0.2 : 0.83 * 1.6, on ? 0.25 : 0.99 * 1.6)
  })
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {segs.filter((s) => s.i !== SECRET_SEG).map((s) => (
          <CuboidCollider key={s.i} args={[s.len / 2, 1, 0.15]} position={[s.x, 1, s.z]} rotation={[0, s.rot, 0]} />
        ))}
      </RigidBody>
      {segs.map((s) => (
        <group key={s.i} position={[s.x, 0, s.z]} rotation={[0, s.rot, 0]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[s.len, 0.9, 0.06]} />
            <meshPhysicalMaterial color="#9fb7d6" transparent opacity={s.i === SECRET_SEG ? 0.09 : 0.12} roughness={0.1} metalness={0} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.91, 0]}>
            <boxGeometry args={[s.len, 0.03, 0.08]} />
            <meshBasicMaterial ref={s.i === SECRET_SEG ? glitch : undefined} color={edge} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
            <boxGeometry args={[s.len, 0.12, 0.2]} />
            <meshStandardMaterial color="#1a2130" metalness={0.5} roughness={0.5} />
          </mesh>
          {s.i === SECRET_SEG && (
            // a hairline crack
            <mesh position={[0.4, 0.45, 0.04]} rotation={[0, 0, 0.5]}>
              <planeGeometry args={[0.02, 0.8]} /><meshBasicMaterial color="#e2e8f0" transparent opacity={0.5} />
            </mesh>
          )}
        </group>
      ))}
      <Graffiti />
      <Gate seg={GATE_EAST} label="TIME TRIAL TRACK" outside="SIM LAB" color="#f43f5e" />
      <Gate seg={GATE_WEST} label="AUV TEST TANK" outside="SIM LAB" color="#38bdf8" />
    </>
  )
}

/** Floor colliders everywhere except the sunken test tank, plus tank walls/railing and the world fence. */
function Ground() {
  const T = TANK
  const cx = (T.x0 + T.x1) / 2, hx = (T.x1 - T.x0) / 2, hz = (T.z1 - T.z0) / 2
  const W = WORLD
  return (
    <RigidBody type="fixed" colliders={false} friction={1}>
      <CuboidCollider args={[(W.x1 - T.x1) / 2, 0.5, (W.z1 - W.z0) / 2]} position={[(W.x1 + T.x1) / 2, -0.5, 0]} />
      <CuboidCollider args={[(T.x0 - W.x0) / 2, 0.5, (W.z1 - W.z0) / 2]} position={[(T.x0 + W.x0) / 2, -0.5, 0]} />
      <CuboidCollider args={[hx, 0.5, (W.z1 - T.z1) / 2]} position={[cx, -0.5, (W.z1 + T.z1) / 2]} />
      <CuboidCollider args={[hx, 0.5, (T.z0 - W.z0) / 2]} position={[cx, -0.5, (T.z0 + W.z0) / 2]} />
      {/* tank basin */}
      <CuboidCollider args={[hx, 0.5, hz]} position={[cx, T.floorY - 0.5, 0]} />
      <CuboidCollider args={[0.2, 2.6, hz]} position={[T.x0 - 0.2, T.floorY + 2.6, 0]} />
      <CuboidCollider args={[0.2, 2.6, hz]} position={[T.x1 + 0.2, T.floorY + 2.6, 0]} />
      <CuboidCollider args={[hx, 2.6, 0.2]} position={[cx, T.floorY + 2.6, T.z0 - 0.2]} />
      <CuboidCollider args={[hx, 2.6, 0.2]} position={[cx, T.floorY + 2.6, T.z1 + 0.2]} />
      {/* world fence */}
      <CuboidCollider args={[0.5, 3, (W.z1 - W.z0) / 2]} position={[W.x0 - 0.5, 3, 0]} />
      <CuboidCollider args={[0.5, 3, (W.z1 - W.z0) / 2]} position={[W.x1 + 0.5, 3, 0]} />
      <CuboidCollider args={[(W.x1 - W.x0) / 2, 3, 0.5]} position={[(W.x0 + W.x1) / 2, 3, W.z0 - 0.5]} />
      <CuboidCollider args={[(W.x1 - W.x0) / 2, 3, 0.5]} position={[(W.x0 + W.x1) / 2, 3, W.z1 + 0.5]} />
    </RigidBody>
  )
}

function Crate({ position, size = 0.8, color = '#c9d3df' }: { position: [number, number, number]; size?: number; color?: string }) {
  return (
    <RigidBody position={position} colliders="cuboid" mass={0.5} linearDamping={3} angularDamping={3} friction={0.9}>
      <RoundedBox args={[size, size, size]} radius={0.06} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
    </RigidBody>
  )
}

function Cone({ position }: { position: [number, number, number] }) {
  const stripe = useMemo(() => new THREE.Color('#f97316'), [])
  return (
    <RigidBody position={position} colliders="hull" mass={0.15} linearDamping={2.5} angularDamping={2}>
      <mesh castShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[0.55, 0.06, 0.55]} />
        <meshStandardMaterial color="#1b2230" />
      </mesh>
      <mesh castShadow position={[0, 0.38, 0]}>
        <coneGeometry args={[0.2, 0.7, 16]} />
        <meshStandardMaterial color={stripe} roughness={0.5} />
      </mesh>
    </RigidBody>
  )
}

export function Arena() {
  const portrait = useThree((st) => st.size.width < st.size.height)
  return (
    <>
      <Ground />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow
        onClick={(e) => {
          // click-to-drive
          if (e.delta > 6) return
          robotState.autopilot = { x: e.point.x, z: e.point.z }
        }}
      >
        <circleGeometry args={[ARENA_RADIUS + 0.2, 96]} />
        <meshStandardMaterial color="#121823" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow
        onClick={(e) => { if (e.delta > 6) return; robotState.autopilot = { x: e.point.x, z: e.point.z } }}
      >
        <primitive object={outerFloorGeo} attach="geometry" />
        <meshStandardMaterial color="#0a0e15" roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.005, 0]}
        args={[52, 52]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#2a3446"
        sectionSize={4}
        sectionThickness={1.1}
        sectionColor="#3b5b7a"
        fadeDistance={55}
        fadeStrength={1.6}
        fadeFrom={0}
      />
      <Walls />

      {/* center pad */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.0, 2.06, 96]} />
        <meshBasicMaterial color={new THREE.Color('#5eead4').multiplyScalar(1.8)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.3, 2.32, 96, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#5eead4" transparent opacity={0.5} />
      </mesh>
      <Text font={fontBold} position={[0, 0.02, portrait ? 3.6 : 3.3]} rotation={[-Math.PI / 2, 0, 0]} fontSize={portrait ? 0.8 : 0.72} maxWidth={portrait ? 5.5 : 20} textAlign="center" lineHeight={1} letterSpacing={0.06} color="#dbe4ef" anchorX="center" anchorY="middle">
        GIRISH KRISHNAN
      </Text>
      <Text font={fontMed} position={[0, 0.02, portrait ? 4.75 : 4.05]} rotation={[-Math.PI / 2, 0, 0]} fontSize={portrait ? 0.2 : 0.22} maxWidth={portrait ? 5.5 : 20} textAlign="center" letterSpacing={0.25} color="#5eead4" anchorX="center" anchorY="middle">
        {portrait ? 'SOFTWARE ENGINEER @ SPACEX' : 'SOFTWARE ENGINEER @ SPACEX · EE + MATH-CS + PHYSICS @ UCSD'}
      </Text>

      {/* pushable props, placed in the gaps between stations so teleports never land on them */}
      <Crate position={[8.8, 0.5, 0.2]} />
      <Crate position={[9.4, 0.5, 1.0]} size={0.6} color="#5eead4" />
      <Crate position={[-9.0, 0.5, -0.4]} size={0.7} color="#f59e0b" />
      <Crate position={[4.6, 0.5, -7.6]} size={0.6} />
      <Crate position={[-4.6, 0.5, -7.6]} size={0.7} color="#93c5fd" />
      <Crate position={[4.6, 0.5, 7.6]} size={0.7} />
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (110 + i * 5) * (Math.PI / 180)
        return <Cone key={i} position={[Math.cos(a) * 8.6, 0.1, Math.sin(a) * 8.6]} />
      })}
    </>
  )
}
