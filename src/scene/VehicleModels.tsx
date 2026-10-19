import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { robotState } from './layout'

const DARK = '#141a24'
const glow = (hex: string, k = 3) => new THREE.Color(hex).multiplyScalar(k)

export interface ModelProps { body: string; accent: string; reducedMotion: boolean; ghost?: boolean }

function useSpin(reducedMotion: boolean, rate = 4) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (ref.current && !reducedMotion) ref.current.rotation.y += dt * rate })
  return ref
}

export function RoverModel({ body, accent, reducedMotion }: ModelProps) {
  const wheels = useRef<THREE.Mesh[]>([])
  const lidar = useSpin(reducedMotion)
  const acc = useMemo(() => glow(accent), [accent])
  const amber = useMemo(() => glow('#fbbf24'), [])
  useFrame((_, dt) => { for (const w of wheels.current) if (w) w.rotation.x += (robotState.speed * dt) / 0.26 })
  const wheelPos: [number, number, number][] = [[-0.62, -0.12, 0.45], [0.62, -0.12, 0.45], [-0.62, -0.12, -0.45], [0.62, -0.12, -0.45]]
  return (
    <group>
      <RoundedBox args={[1.05, 0.42, 1.35]} radius={0.12} smoothness={3} castShadow>
        <meshStandardMaterial color={body} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      <RoundedBox args={[1.1, 0.14, 1.4]} radius={0.06} smoothness={2} position={[0, -0.14, 0]} castShadow>
        <meshStandardMaterial color={DARK} roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.03, 0.68]}><boxGeometry args={[0.7, 0.22, 0.02]} /><meshStandardMaterial color="#05070b" roughness={0.2} metalness={0.4} /></mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.03, 0.695]}><capsuleGeometry args={[0.035, 0.08, 4, 8]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>
      ))}
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.02, -0.68]}><boxGeometry args={[0.16, 0.05, 0.02]} /><meshBasicMaterial color={amber} toneMapped={false} /></mesh>
      ))}
      {wheelPos.map((wp, i) => (
        <group key={i} position={wp}>
          <mesh ref={(m) => { if (m) wheels.current[i] = m }} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 0.2, 18]} /><meshStandardMaterial color="#0b0e14" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[wp[0] > 0 ? 0.105 : -0.105, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.02, 16]} /><meshStandardMaterial color="#9aa6b5" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.3, -0.15]} castShadow><cylinderGeometry args={[0.07, 0.09, 0.2, 12]} /><meshStandardMaterial color={DARK} roughness={0.5} /></mesh>
      <group position={[0, 0.47, -0.15]}>
        <mesh castShadow><cylinderGeometry args={[0.2, 0.2, 0.16, 24]} /><meshStandardMaterial color="#1b2230" roughness={0.3} metalness={0.6} /></mesh>
        <mesh><cylinderGeometry args={[0.205, 0.205, 0.035, 24]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>
        <group ref={lidar}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <ringGeometry args={[0.3, 6, 32, 1, 0, 0.35]} />
            <meshBasicMaterial color={accent} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      <mesh position={[0.35, 0.45, -0.45]}><cylinderGeometry args={[0.012, 0.012, 0.5, 6]} /><meshStandardMaterial color="#9aa6b5" /></mesh>
      <mesh position={[0.35, 0.72, -0.45]}><sphereGeometry args={[0.04, 12, 12]} /><meshBasicMaterial color={amber} toneMapped={false} /></mesh>
    </group>
  )
}

export const CarModel = forwardRef<THREE.Group, ModelProps>(function CarModel({ body, accent, ghost }, ref) {
  const wheels = useRef<THREE.Mesh[]>([])
  const acc = useMemo(() => glow(accent, 2.5), [accent])
  useFrame((_, dt) => { if (!ghost) for (const w of wheels.current) if (w) w.rotation.x += (robotState.speed * dt) / 0.2 })
  const mat = ghost
    ? <meshBasicMaterial color={accent} transparent opacity={0.35} depthWrite={false} />
    : <meshStandardMaterial color={body} roughness={0.3} metalness={0.3} />
  const wp: [number, number, number][] = [[-0.42, -0.1, 0.58], [0.42, -0.1, 0.58], [-0.42, -0.1, -0.55], [0.42, -0.1, -0.55]]
  return (
    <group ref={ref}>
      {/* chassis plate + body shell */}
      <mesh position={[0, -0.12, 0]} castShadow={!ghost}><boxGeometry args={[0.62, 0.05, 1.7]} />{ghost ? mat : <meshStandardMaterial color="#111" />}</mesh>
      <RoundedBox args={[0.5, 0.2, 1.35]} radius={0.08} smoothness={2} position={[0, 0.02, -0.02]} castShadow={!ghost}>{mat}</RoundedBox>
      <RoundedBox args={[0.32, 0.14, 0.5]} radius={0.06} smoothness={2} position={[0, 0.16, 0.05]} castShadow={!ghost}>{mat}</RoundedBox>
      {/* front wing + rear wing */}
      <mesh position={[0, -0.06, 0.88]}><boxGeometry args={[0.78, 0.03, 0.14]} />{ghost ? mat : <meshStandardMaterial color={DARK} />}</mesh>
      <mesh position={[0, 0.28, -0.78]}><boxGeometry args={[0.7, 0.03, 0.18]} />{ghost ? mat : <meshStandardMaterial color={DARK} />}</mesh>
      {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.15, -0.76]}><boxGeometry args={[0.03, 0.25, 0.12]} />{ghost ? mat : <meshStandardMaterial color={DARK} />}</mesh>)}
      {/* LiDAR puck */}
      <mesh position={[0, 0.3, 0.32]}><cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />{ghost ? mat : <meshStandardMaterial color="#222" />}</mesh>
      {!ghost && <mesh position={[0, 0.3, 0.32]}><cylinderGeometry args={[0.083, 0.083, 0.02, 16]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>}
      {wp.map((p, i) => (
        <mesh key={i} position={p} rotation={[0, 0, Math.PI / 2]} ref={(m) => { if (m) wheels.current[i] = m }} castShadow={!ghost}>
          <cylinderGeometry args={[0.2, 0.2, 0.16, 16]} />{ghost ? mat : <meshStandardMaterial color="#0b0e14" roughness={0.9} />}
        </mesh>
      ))}
      {!ghost && [-0.18, 0.18].map((x) => <mesh key={x} position={[x, 0.0, -0.7]}><boxGeometry args={[0.1, 0.04, 0.02]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>)}
    </group>
  )
})

export function QuadModel({ body, accent, reducedMotion }: ModelProps) {
  const props = useRef<THREE.Mesh[]>([])
  const acc = useMemo(() => glow(accent, 2.5), [accent])
  useFrame((_, dt) => { if (!reducedMotion) props.current.forEach((p, i) => p && (p.rotation.y += dt * (i % 2 ? 40 : -40))) })
  const arms: [number, number][] = [[0.55, 0.55], [-0.55, 0.55], [0.55, -0.55], [-0.55, -0.55]]
  return (
    <group>
      <RoundedBox args={[0.42, 0.16, 0.5]} radius={0.06} smoothness={2} castShadow><meshStandardMaterial color={body} roughness={0.35} /></RoundedBox>
      {/* green PCB stack: nod to the custom flight controller */}
      <mesh position={[0, 0.1, 0]}><boxGeometry args={[0.3, 0.02, 0.3]} /><meshStandardMaterial color="#166534" roughness={0.6} /></mesh>
      <mesh position={[0, -0.02, 0.26]}><sphereGeometry args={[0.05, 12, 12]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>
      {arms.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x / 2, 0, z / 2]} rotation={[0, Math.atan2(x, z), 0]} castShadow><boxGeometry args={[0.06, 0.04, 0.78]} /><meshStandardMaterial color={DARK} /></mesh>
          <mesh position={[x, 0.04, z]}><cylinderGeometry args={[0.06, 0.06, 0.1, 12]} /><meshStandardMaterial color="#333" metalness={0.6} /></mesh>
          <mesh position={[x, 0.1, z]} ref={(m) => { if (m) props.current[i] = m }}>
            <boxGeometry args={[0.5, 0.01, 0.06]} /><meshStandardMaterial color="#cbd5e1" transparent opacity={0.75} />
          </mesh>
          <mesh position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.26, 0.28, 24]} /><meshBasicMaterial color={i < 2 ? acc : glow('#f43f5e', 2.5)} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function AuvModel({ body, accent, reducedMotion }: ModelProps) {
  const prop = useRef<THREE.Group>(null)
  const acc = useMemo(() => glow(accent, 2.5), [accent])
  useFrame((_, dt) => { if (prop.current && !reducedMotion) prop.current.rotation.z += dt * (6 + robotState.speed * 6) })
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><capsuleGeometry args={[0.28, 1.3, 6, 16]} /><meshStandardMaterial color={body} roughness={0.35} /></mesh>
      <mesh position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.03, 20]} /><meshBasicMaterial color={acc} toneMapped={false} /></mesh>
      <mesh position={[0, 0.3, 0.1]}><boxGeometry args={[0.06, 0.22, 0.4]} /><meshStandardMaterial color={DARK} /></mesh>
      {/* tail fins */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0, -0.75]} rotation={[0, 0, (i * Math.PI) / 2]}>
          <boxGeometry args={[0.02, 0.62, 0.22]} /><meshStandardMaterial color={DARK} />
        </mesh>
      ))}
      <group ref={prop} position={[0, 0, -0.95]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]}><boxGeometry args={[0.05, 0.36, 0.02]} /><meshStandardMaterial color="#9aa6b5" metalness={0.7} /></mesh>
        ))}
      </group>
      <pointLight position={[0, 0, 1.1]} intensity={6} distance={6} color="#bae6fd" />
    </group>
  )
}
