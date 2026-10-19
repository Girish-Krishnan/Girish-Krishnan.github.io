import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { TANK, robotState, inTank } from '../layout'
import { on, useFeature } from '../../game/bus'
import { useGame } from '../../game/store'
import { toast } from '../../game/toasts'
import { auv, BEACONS, SUNKEN_PI, ACOUSTIC_DEPTHS } from '../../game/auv'
import { useSim } from '../../store'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const cx = (TANK.x0 + TANK.x1) / 2
const W = TANK.x1 - TANK.x0, D = TANK.z1 - TANK.z0
const PING_SPEED = 9, PING_RANGE = 15
const SCAN_DIST = 2.0
const once = { pi: false, hint: false }

const causticFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 26.0;
    float t = uTime * 0.7;
    float w = 0.0;
    for (int n = 0; n < 3; n++) {
      p += vec2(sin(p.y * 0.73 + t), cos(p.x * 0.67 - t * 0.9)) * 0.55;
      w += abs(sin(p.x) * sin(p.y));
    }
    float v = pow(1.0 - w / 3.0, 7.0);
    gl_FragColor = vec4(vec3(0.5, 0.9, 1.0) * v * 0.9, v * 0.8);
  }
`
const causticVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`

function Caustics({ reducedMotion }: { reducedMotion: boolean }) {
  const uniforms = useMemo(() => ({ uTime: { value: 3 } }), [])
  useFrame((_, dt) => { if (!reducedMotion) uniforms.uTime.value += dt })
  return (
    <mesh position={[cx, TANK.floorY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[W, D]} />
      <shaderMaterial uniforms={uniforms} vertexShader={causticVert} fragmentShader={causticFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function Beacon({ i, x, z, revealed, scanned }: { i: number; x: number; z: number; revealed: boolean; scanned: boolean }) {
  const light = useRef<THREE.MeshBasicMaterial>(null)
  const amber = useMemo(() => new THREE.Color('#fbbf24').multiplyScalar(2.5), [])
  const teal = useMemo(() => new THREE.Color('#5eead4').multiplyScalar(2.5), [])
  const off = useMemo(() => new THREE.Color('#10202b'), [])
  useFrame(({ clock }) => {
    if (!light.current) return
    if (scanned) light.current.color.copy(teal)
    else if (revealed) light.current.color.copy(amber).multiplyScalar(0.55 + 0.45 * Math.sin(clock.elapsedTime * 5))
    else light.current.color.copy(off)
  })
  return (
    <group position={[x, TANK.floorY, z]}>
      <mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.35, 0.4, 0.1, 16]} /><meshStandardMaterial color="#1a2a35" roughness={0.8} transparent opacity={revealed ? 1 : 0.12} depthWrite={revealed} /></mesh>
      <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.05, 0.05, 0.6, 8]} /><meshStandardMaterial color="#2b3b47" transparent opacity={revealed ? 1 : 0.12} depthWrite={revealed} /></mesh>
      <mesh position={[0, 0.7, 0]} visible={revealed}><sphereGeometry args={[0.13, 16, 12]} /><meshBasicMaterial ref={light} color={off} toneMapped={false} /></mesh>
      {revealed && (
        <Text font={fontBold} position={[0, 1.25, 0]} fontSize={0.32} color={scanned ? '#5eead4' : '#fbbf24'} anchorX="center" outlineWidth={0.02} outlineColor="#020617">
          {`B${i + 1}${scanned ? ' ✓' : ''}`}
        </Text>
      )}
    </group>
  )
}

function SunkenPi({ revealed }: { revealed: boolean }) {
  return (
    <group position={[SUNKEN_PI.x, TANK.floorY + 0.04, SUNKEN_PI.z]} rotation={[0, 0.6, 0.12]} visible={revealed}>
      <mesh><boxGeometry args={[0.85, 0.05, 0.56]} /><meshStandardMaterial color="#166534" roughness={0.6} /></mesh>
      <mesh position={[0.2, 0.07, 0]}><boxGeometry args={[0.2, 0.08, 0.2]} /><meshStandardMaterial color="#cbd5e1" metalness={0.8} /></mesh>
      <mesh position={[-0.25, 0.06, -0.15]}><boxGeometry args={[0.25, 0.06, 0.12]} /><meshStandardMaterial color="#111827" /></mesh>
      {revealed && <Text font={fontBold} position={[0, 1.0, 0]} fontSize={0.26} color="#86efac" anchorX="center" outlineWidth={0.02} outlineColor="#020617">?</Text>}
    </group>
  )
}

/** Interactive layer of the test tank: depth-hold PID, sonar pings, survey beacons, acoustic profile. */
export default function TankLab({ reducedMotion }: { reducedMotion: boolean }) {
  const scanned = useGame((s) => s.beacons)
  const revealedRef = useRef<Set<number>>(new Set())
  const [, setTick] = useState(0)
  const force = () => setTick((t) => t + 1)
  const ping = useRef({ active: false, t: 0, x: 0, y: 0, z: 0 })
  const shell = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const shellMat = useRef<THREE.MeshBasicMaterial>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const rec = useRef({ target: null as number | null, t: 0, uiT: 0 })
  const piFound = useRef(false)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  // keep the sonar wavefront inside the water volume
  const clip = useMemo(() => [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -TANK.x0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), TANK.x1),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -TANK.z0), new THREE.Plane(new THREE.Vector3(0, 0, -1), TANK.z1),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), TANK.waterY),
  ], [])
  useEffect(() => { gl.localClippingEnabled = true }, [gl])
  const fogState = useRef({ k: 0 })
  const fogA = useMemo(() => new THREE.Color('#070a10'), [])
  const fogB = useMemo(() => new THREE.Color('#06374a'), [])
  const setF = useFeature((s) => s.set)

  useEffect(() => on('sonar:ping', () => {
    const g = useGame.getState()
    const P = robotState.pos
    if (g.vehicle !== 'auv' || !inTank(P.x, P.z)) { toast('Sonar needs water', 'Switch to the AUV in the test tank first.', 'warn'); return }
    if (ping.current.active) return
    ping.current = { active: true, t: 0, x: P.x, y: P.y, z: P.z }
    setF('tank', { lastPing: performance.now() })
  }), [setF])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const P = robotState.pos
    const g = useGame.getState()
    const isAuv = g.vehicle === 'auv' && inTank(P.x, P.z)
    // underwater murk: fog closes in and turns teal while the AUV is submerged
    const fog = scene.fog as THREE.Fog | null
    if (fog) {
      const want = isAuv && P.y < TANK.waterY ? 1 : 0
      const f = fogState.current
      f.k = reducedMotion ? want : THREE.MathUtils.damp(f.k, want, 3, dt)
      fog.color.copy(fogA).lerp(fogB, f.k)
      fog.near = THREE.MathUtils.lerp(30, 8, f.k)
      fog.far = THREE.MathUtils.lerp(70, 34, f.k)
    }
    // sonar ping
    const pg = ping.current
    if (pg.active) {
      pg.t += dt
      const r = pg.t * PING_SPEED
      const fade = Math.max(0, 1 - r / PING_RANGE)
      if (shell.current && shellMat.current) { shell.current.visible = true; shell.current.position.set(pg.x, pg.y, pg.z); shell.current.scale.setScalar(Math.max(0.01, r)); shellMat.current.opacity = 0.14 * fade }
      if (ring.current && ringMat.current) { ring.current.visible = true; ring.current.position.set(pg.x, TANK.floorY + 0.06, pg.z); ring.current.scale.setScalar(Math.max(0.01, r)); ringMat.current.opacity = 0.9 * fade }
      let changed = false
      BEACONS.forEach((b, i) => {
        if (!revealedRef.current.has(i) && Math.hypot(b.x - pg.x, TANK.floorY - pg.y, b.z - pg.z) < r) { revealedRef.current.add(i); changed = true }
      })
      if (!piFound.current && Math.hypot(SUNKEN_PI.x - pg.x, SUNKEN_PI.z - pg.z) < r) { piFound.current = true; changed = true }
      if (changed) { force(); setF('tank', { contacts: revealedRef.current.size + (piFound.current ? 1 : 0) }) }
      if (r > PING_RANGE) { pg.active = false; if (shell.current) shell.current.visible = false; if (ring.current) ring.current.visible = false }
    }
    if (!isAuv) return
    // scan revealed beacons by swimming close
    BEACONS.forEach((b, i) => {
      if (!revealedRef.current.has(i) || g.beacons.includes(i)) return
      if (Math.hypot(b.x - P.x, TANK.floorY + 0.7 - P.y, b.z - P.z) < SCAN_DIST) {
        const list = [...g.beacons, i]
        g.set({ beacons: list })
        if (list.length >= BEACONS.length) g.complete('survey')
        else toast(`Beacon B${i + 1} scanned`, `${list.length}/${BEACONS.length} · ping again to find the rest.`)
      }
    })
    if (piFound.current && Math.hypot(SUNKEN_PI.x - P.x, TANK.floorY + 0.5 - P.y, SUNKEN_PI.z - P.z) < SCAN_DIST && !once.pi) {
      once.pi = true
      toast('Sunken Raspberry Pi', 'Still trying to boot. (The real AUVs I worked on ran on Pis too, in drier enclosures.)')
    }
    // acoustic profile: hold each target depth steadily for 2.5 s
    const R = rec.current
    const target = auv.hold ? ACOUSTIC_DEPTHS.find((t) => !g.acoustic.includes(t) && Math.abs(auv.setpoint - t) < 0.2 && Math.abs(auv.depth - t) < 0.12) ?? null : null
    if (target !== R.target) { R.target = target; R.t = 0 }
    if (target != null) {
      R.t += dt
      if (R.t >= 2.5) {
        const list = [...g.acoustic, target].sort()
        g.set({ acoustic: list })
        R.target = null; R.t = 0
        if (list.length >= ACOUSTIC_DEPTHS.length) g.complete('acoustic')
        else toast(`Acoustic sample at ${target} m`, `${list.length}/${ACOUSTIC_DEPTHS.length} depths recorded.`)
      }
    }
    R.uiT += dt
    if (R.uiT > 0.15) { R.uiT = 0; setF('tank', { recording: R.target, progress: R.target != null ? Math.min(1, R.t / 2.5) : 0 }) }
  })

  // first time in the tank with the AUV: a short how-to
  useEffect(() => useSim.subscribe((s, p) => {
    if (s.zone === 'tank' && p.zone !== 'tank' && !once.hint) {
      once.hint = true
      const g = useGame.getState()
      toast('AUV test tank', g.vehicle === 'auv' ? 'Space/Shift (▲▼) set the depth; the PID holds it. Q pings sonar.' : 'Switch to the AUV (Garage or `vehicle auv`) to dive.')
    }
  }), [])

  const neonSonar = useMemo(() => new THREE.Color('#38bdf8').multiplyScalar(2), [])
  return (
    <group>
      <Caustics reducedMotion={reducedMotion} />
      {BEACONS.map((b, i) => <Beacon key={i} i={i} x={b.x} z={b.z} revealed={revealedRef.current.has(i) || scanned.includes(i)} scanned={scanned.includes(i)} />)}
      <SunkenPi revealed={piFound.current} />
      <mesh ref={shell} visible={false}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial ref={shellMat} color={neonSonar} transparent opacity={0.15} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} wireframe clippingPlanes={clip} />
      </mesh>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.96, 1, 64]} />
        <meshBasicMaterial ref={ringMat} color={neonSonar} transparent depthWrite={false} toneMapped={false} clippingPlanes={clip} />
      </mesh>
      <Text font={fontBold} position={[TANK.x1 + 3.5, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.26} letterSpacing={0.16} color="#7dd3fc" anchorX="center">
        DEPTH HOLD · SONAR · SURVEY BEACONS
      </Text>
    </group>
  )
}
