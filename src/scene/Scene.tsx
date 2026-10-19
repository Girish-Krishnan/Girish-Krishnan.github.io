import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { useSim } from '../store'
import { useGame } from '../game/store'
import { vehicleById } from '../game/vehicles'
import { useCoarsePointer, useNarrow, useReducedMotion } from '../hooks'
import { StudioEnv } from './StudioEnv'
import { Vehicle } from './Vehicle'
import { Stations } from './Stations'
import { Arena } from './Arena'
import { robotState, PADS } from './layout'
import { live } from '../game/bus'

const Effects = lazy(() => import('./Effects'))
// feature zones: split into their own chunks and mounted after first render
const Tank = lazy(() => import('./zones/Tank'))
const PlanningPad = lazy(() => import('./zones/PlanningPad'))
const CartPole = lazy(() => import('./zones/CartPole'))
const Slam = lazy(() => import('./zones/Slam'))
const RaceTrack = lazy(() => import('./zones/RaceTrack'))
const LaunchPad = lazy(() => import('./zones/LaunchPad'))
const WeldCell = lazy(() => import('./zones/WeldCell'))
const SecretRoom = lazy(() => import('./zones/SecretRoom'))

const tmpPos = new THREE.Vector3()
const tmpLook = new THREE.Vector3()
const look = new THREE.Vector3()

function CameraRig({ reducedMotion, narrow }: { reducedMotion: boolean; narrow: boolean }) {
  const { camera, size } = useThree()
  useEffect(() => {
    // test/debug hook: world → screen projection
    const w = window as any
    if (w.__simlab) w.__simlab.project = (x: number, y: number, z: number) => { const v = camera.position.clone().set(x, y, z).project(camera); return { x: (v.x + 1) / 2 * size.width, y: (1 - v.y) / 2 * size.height } }
  }, [camera, size])
  const first = useRef(true)
  const chaseHeading = useRef(robotState.heading)
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const s = useSim.getState()
    const g = useGame.getState()
    const ctl = vehicleById(g.vehicle).control
    const portrait = size.width < size.height
    const fov = portrait ? 56 : 42
    const cam = camera as THREE.PerspectiveCamera
    const P = robotState.pos
    const shift = (s.openStation || s.openSheet) && !narrow ? 3.4 : 0
    const chase = ctl === 'car' && !reducedMotion && !robotState.autopilot && !(live.launching && s.zone === 'launch')
    if (chase) {
      // chase cam behind the car, lagging the heading slightly
      chaseHeading.current += (((robotState.heading - chaseHeading.current + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) * (1 - Math.exp(-4 * dt))
      const h = chaseHeading.current
      const back = portrait ? 9 : 7.5, up = portrait ? 5.5 : 3.6
      tmpPos.set(P.x - Math.sin(h) * back, up, P.z - Math.cos(h) * back)
      tmpLook.set(P.x + Math.sin(h) * 4, 0.6, P.z + Math.cos(h) * 4)
    } else {
      chaseHeading.current = robotState.heading
      // framing helper: at the algorithm pads, frame the pad (not just the vehicle)
      const launchCam = live.launching && s.zone === 'launch'
      const pad = ctl === 'screen' && (s.zone === 'planning' || s.zone === 'cartpole' || s.zone === 'weld') ? PADS[s.zone] : null
      const weldCam = !!pad && s.zone === 'weld'
      const pull = weldCam ? 0.85 : 0.7
      const F = launchCam ? PADS.launch : pad ? { x: P.x + (pad.x - P.x) * pull, z: P.z + (pad.z - P.z) * pull } : P
      const k = pad ? (s.zone === 'planning' ? 1.2 : weldCam ? 0.62 : 1.0) : 1
      // weld cell: closer framing, nudged right so the zone panel (bottom-left) doesn't cover the plate
      const wshift = weldCam && !narrow && !portrait ? -1.7 : 0
      const off = launchCam ? [0, portrait ? 8 : 6, portrait ? 24 : 18] : (portrait ? [0, 15, 14.5] : [0, 10.5, 13]).map((v) => v * k)
      const baseY = ctl === 'fly' ? Math.max(0, P.y - 0.5) : ctl === 'swim' ? 0 : 0
      const lookY = launchCam ? 4 + Math.min(live.rocketY, 22) * 0.75 : ctl === 'fly' ? P.y : ctl === 'swim' ? P.y : 0.6
      tmpPos.set(F.x + off[0] + shift + wshift, off[1] + baseY, F.z + off[2] - (ctl === 'swim' ? 3 : 0))
      tmpLook.set(F.x + shift + wshift, lookY, F.z - (portrait ? 1.5 : 0.5) + (pad && portrait ? 2.5 : 0))
    }
    const wantFov = chase ? fov + 10 : fov
    if (Math.abs(cam.fov - wantFov) > 0.05) { cam.fov = THREE.MathUtils.damp(cam.fov, wantFov, 4, dt); cam.updateProjectionMatrix() }
    if (first.current) {
      first.current = false
      if (reducedMotion) { camera.position.copy(tmpPos); look.copy(tmpLook) }
      else { camera.position.set(0, 34, 38); look.set(0, 0, -4) }
    }
    const recentTeleport = performance.now() - robotState.teleportedAt < 80
    if (reducedMotion || recentTeleport && reducedMotion) { camera.position.copy(tmpPos); look.copy(tmpLook) }
    else {
      camera.position.lerp(tmpPos, 1 - Math.exp(-(chase ? 5 : 3) * dt))
      look.lerp(tmpLook, 1 - Math.exp(-(chase ? 8 : 5) * dt))
    }
    camera.lookAt(look)
  })
  return null
}

function Ready() {
  useEffect(() => {
    const t = setTimeout(() => useSim.getState().setSceneReady(true), 50)
    return () => clearTimeout(t)
  }, [])
  return null
}

export default function Scene() {
  const reducedMotion = useReducedMotion()
  const touch = useCoarsePointer()
  const narrow = useNarrow()
  const [dprMax, setDprMax] = useState(touch ? 1.25 : 1.5)
  const [fx, setFx] = useState(true)
  const [hidden, setHidden] = useState(document.hidden)
  const ready = useSim((s) => s.sceneReady)
  const [zonesOn, setZonesOn] = useState(false)
  const slam = useGame((s) => s.slam)
  const gravity = useGame((s) => (s.lowGravity ? s.gravity : -20))

  useEffect(() => { (window as any).__reduced = reducedMotion }, [reducedMotion])
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => setZonesOn(true), 600)
    return () => clearTimeout(t)
  }, [ready])

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, dprMax]}
      camera={{ fov: 42, near: 0.1, far: 220, position: [0, 34, 38] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      frameloop={hidden ? 'never' : 'always'}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}
    >
      <PerformanceMonitor onDecline={() => { setDprMax(1); setFx(false) }} />
      <color attach="background" args={['#070a10']} />
      <fog attach="fog" args={['#070a10', 30, 70]} />

      <hemisphereLight args={['#b9d4ff', '#0b0f17', 0.55]} />
      <ShadowSun touch={touch} />
      <pointLight position={[0, 6, 0]} intensity={30} distance={22} color="#5eead4" />
      <StudioEnv />

      <Suspense fallback={null}>
        <Physics gravity={[0, gravity, 0]} paused={hidden}>
          <Arena />
          <Stations reducedMotion={reducedMotion} />
          <Vehicle reducedMotion={reducedMotion} />
          {zonesOn && (
            <Suspense fallback={null}>
              <Tank reducedMotion={reducedMotion} />
              <PlanningPad />
              <CartPole />
              <RaceTrack />
              <LaunchPad reducedMotion={reducedMotion} />
              <WeldCell reducedMotion={reducedMotion} />
              <SecretRoom reducedMotion={reducedMotion} />
            </Suspense>
          )}
          {zonesOn && slam && (
            <Suspense fallback={null}>
              <Slam />
            </Suspense>
          )}
        </Physics>
        <Ready />
      </Suspense>

      <CameraRig reducedMotion={reducedMotion} narrow={narrow} />

      {fx && ready && (
        <Suspense fallback={null}>
          <Effects msaa={touch ? 0 : 4} />
        </Suspense>
      )}
    </Canvas>
  )
}

/** Directional light whose shadow frustum follows the vehicle (so shadows work outside the lab too). */
function ShadowSun({ touch }: { touch: boolean }) {
  const light = useRef<THREE.DirectionalLight>(null)
  const { scene } = useThree()
  useEffect(() => { if (light.current) scene.add(light.current.target) }, [scene])
  useFrame(() => {
    const l = light.current
    if (!l) return
    const P = robotState.pos
    const cx = Math.round(P.x / 4) * 4, cz = Math.round(P.z / 4) * 4
    l.position.set(cx + 10, 18, cz + 8)
    l.target.position.set(cx, 0, cz)
  })
  return (
    <directionalLight
      ref={light}
      position={[10, 18, 8]}
      intensity={2.4}
      castShadow
      shadow-mapSize={touch ? [1024, 1024] : [2048, 2048]}
      shadow-camera-left={-24}
      shadow-camera-right={24}
      shadow-camera-top={24}
      shadow-camera-bottom={-24}
      shadow-camera-near={1}
      shadow-camera-far={60}
      shadow-bias={-0.0004}
      shadow-normalBias={0.03}
    />
  )
}
