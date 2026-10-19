import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { robotState } from '../layout'
import { CarModel } from '../VehicleModels'
import { track, N, TRACK_W, CHECKPOINTS, nearest, headingAt, devGhost, fmtLap } from '../../game/track'
import { useRace } from '../../game/race'
import { useGame } from '../../game/store'
import { useSim } from '../../store'
import { vehicleById } from '../../game/vehicles'
import { leaderboard, TRACK_ID } from '../../game/leaderboard'
import { toast } from '../../game/toasts'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const H = TRACK_W / 2
const RED = new THREE.Color('#f43f5e'), WHITE = new THREE.Color('#e5e7eb')

function strip(offA: number, offB: number, y: number, colorAt?: (i: number) => THREE.Color, skip?: (i: number) => boolean) {
  const pos: number[] = [], col: number[] = []
  for (let i = 0; i < N; i++) {
    if (skip?.(i)) continue
    const b = (i + 1) % N
    const P = (k: number, o: number) => [track.x[k] + track.tz[k] * o, y, track.z[k] - track.tx[k] * o]
    const a0 = P(i, offA), a1 = P(i, offB), b0 = P(b, offA), b1 = P(b, offB)
    pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1)
    if (colorAt) { const c = colorAt(i); for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  if (colorAt) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

function sampleGhost(s: number[], t: number, out: { x: number; z: number; h: number }) {
  const n = s.length / 4
  if (!n) return false
  let lo = 0, hi = n - 1
  if (t >= s[(n - 1) * 4]) { out.x = s[(n - 1) * 4 + 1]; out.z = s[(n - 1) * 4 + 2]; out.h = s[(n - 1) * 4 + 3]; return true }
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m * 4] <= t) lo = m; else hi = m }
  const f = Math.max(0, Math.min(1, (t - s[lo * 4]) / Math.max(1, s[hi * 4] - s[lo * 4])))
  out.x = s[lo * 4 + 1] + (s[hi * 4 + 1] - s[lo * 4 + 1]) * f
  out.z = s[lo * 4 + 2] + (s[hi * 4 + 2] - s[lo * 4 + 2]) * f
  let dh = s[hi * 4 + 3] - s[lo * 4 + 3]
  dh = ((dh + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  out.h = s[lo * 4 + 3] + dh * f
  return true
}

export default function RaceTrack() {
  const geos = useMemo(() => ({
    road: strip(H, -H, 0.012),
    curbL: strip(H, H + 0.6, 0.02, (i) => (Math.floor(i / 6) % 2 ? RED : WHITE)),
    curbR: strip(-H - 0.6, -H, 0.02, (i) => (Math.floor(i / 6) % 2 ? RED : WHITE)),
    dash: strip(0.08, -0.08, 0.016, undefined, (i) => Math.floor(i / 5) % 2 === 1),
  }), [])
  const checker = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 16; c.height = 2
    const x = c.getContext('2d')!
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#111' : '#f8fafc'; x.fillRect(i, j, 1, 1) }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  const cpMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const devRef = useRef<THREE.Group>(null)
  const youRef = useRef<THREE.Group>(null)
  const st = useRef({ prevIdx: -1, lapT: 0, rec: [] as number[], recT: 0, lapStartWall: 0, uiT: 0, cp: 0, phase: 'idle' as 'idle' | 'armed' | 'running' })
  const tmp = useMemo(() => ({ x: 0, z: 0, h: 0 }), [])
  const cpOn = useMemo(() => new THREE.Color('#5eead4').multiplyScalar(2), [])
  const cpOff = useMemo(() => new THREE.Color('#475569'), [])
  const h0 = headingAt(0)
  useEffect(() => {
    // test hook: queue a full centerline lap for the autopilot (used by headless checks)
    const w = window as any
    if (w.__simlab) w.__simlab.lapPath = () => {
      const pts: { x: number; z: number }[] = []
      for (let k = 6; k < N + 30; k += 8) pts.push({ x: track.x[k % N], z: track.z[k % N] })
      robotState.autopilot = null
      robotState.path = pts
    }
  }, [])

  useFrame((_, dtRaw) => {
    const s = st.current
    const dt = Math.min(dtRaw, 0.1)
    const race = useRace.getState()
    const zone = useSim.getState().zone
    const g = useGame.getState()
    const ctl = vehicleById(g.vehicle).control
    const P = robotState.pos
    const ground = (ctl === 'screen' || ctl === 'car') && P.y < 2
    const setPhase = (phase: typeof s.phase, extra: Partial<ReturnType<typeof useRace.getState>> = {}) => { s.phase = phase; race.set({ phase, ...extra }) }

    if (zone !== 'track') {
      robotState.offTrack = false
      if (s.phase !== 'idle') setPhase('idle', { lapMs: 0, cp: 0, offTrack: false })
      s.prevIdx = -1
      if (devRef.current) devRef.current.visible = false
      if (youRef.current) youRef.current.visible = false
      return
    }
    const { i, d } = nearest(P.x, P.z, s.prevIdx)
    const off = d > H + 0.6
    robotState.offTrack = off
    if (off !== race.offTrack) race.set({ offTrack: off })
    if (s.phase === 'idle') setPhase('armed', { invalid: null })

    const abort = (why: string) => { setPhase('armed', { lapMs: 0, cp: 0, invalid: why }); s.cp = 0 }
    if (s.phase === 'running') {
      if (!ground) abort('Lap void: ground vehicles only (rover or F1TENTH).')
      else if (robotState.teleportedAt > s.lapStartWall) abort('Lap void: teleported.')
    }
    if (s.prevIdx >= 0 && ground) {
      const fwdCross = s.prevIdx > N - 60 && i < 60
      const backCross = s.prevIdx < 60 && i > N - 60
      if (backCross && s.phase === 'running') abort('Lap void: wrong way over the line.')
      if (s.phase === 'running' && s.cp < CHECKPOINTS) {
        const c = track.cps[s.cp]
        if (i >= c && i < c + 50 && d < H + 3) { s.cp++; race.set({ cp: s.cp }) }
      }
      if (fwdCross) {
        if (s.phase === 'running') {
          if (s.cp >= CHECKPOINTS) {
            const ms = Math.round(s.lapT * 1000)
            const rec = s.rec.slice()
            const entry = { ms, vehicle: g.vehicle, callsign: g.callsign || 'visitor', at: Date.now() }
            leaderboard.submit(TRACK_ID, entry, rec).then(({ best, rank }) => {
              race.set({ lastMs: ms, lastBest: best })
              toast(best ? 'New best lap!' : 'Lap complete', `${fmtLap(ms)} · #${rank} on this device${ms < devGhost.lapMs ? ' · beat the dev ghost!' : ` · dev ghost ${fmtLap(devGhost.lapMs)}`}`, best ? 'mission' : 'info')
              if (ms < devGhost.lapMs) useGame.getState().complete('laptime')
            })
          } else race.set({ invalid: `Missed checkpoint ${s.cp + 1}. Lap not counted.` })
        }
        // (re)start the lap: rolling start
        s.phase = 'running'; s.lapT = 0; s.rec = []; s.recT = 0; s.cp = 0; s.lapStartWall = performance.now()
        race.set({ phase: 'running', lapMs: 0, cp: 0, invalid: null })
      }
    }
    s.prevIdx = ground ? i : -1

    if (s.phase === 'running') {
      s.lapT += dt
      s.recT += dt
      if (s.recT >= 0.05 || !s.rec.length) {
        s.recT = 0
        s.rec.push(Math.round(s.lapT * 1000), +P.x.toFixed(2), +P.z.toFixed(2), +robotState.heading.toFixed(3))
      }
      if (s.lapT > 180) abort('Lap timed out.')
    }
    s.uiT += dt
    if (s.uiT > 0.1) { s.uiT = 0; if (s.phase === 'running') race.set({ lapMs: Math.round(s.lapT * 1000) }) }

    // checkpoint arch colours
    for (let k = 0; k < CHECKPOINTS; k++) cpMats.current[k]?.color.copy(s.phase === 'running' && k < s.cp ? cpOn : cpOff)

    // ghosts
    const t = s.phase === 'running' ? s.lapT * 1000 : 0
    const show = race.ghosts
    if (devRef.current) {
      devRef.current.visible = show
      if (show && sampleGhost(devGhost.samples, t, tmp)) { devRef.current.position.set(tmp.x, 0.25, tmp.z); devRef.current.rotation.y = tmp.h }
    }
    if (youRef.current) {
      const gh = g.ghost
      youRef.current.visible = show && !!gh
      if (show && gh && sampleGhost(gh, t, tmp)) { youRef.current.position.set(tmp.x, 0.25, tmp.z); youRef.current.rotation.y = tmp.h }
    }
  })

  const p0 = { x: track.x[0], z: track.z[0] }
  return (
    <group>
      <mesh geometry={geos.road} receiveShadow>
        <meshStandardMaterial color="#272d38" roughness={0.85} metalness={0.05} polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh geometry={geos.curbL}><meshStandardMaterial vertexColors roughness={0.6} /></mesh>
      <mesh geometry={geos.curbR}><meshStandardMaterial vertexColors roughness={0.6} /></mesh>
      <mesh geometry={geos.dash}><meshBasicMaterial color="#94a3b8" /></mesh>
      {/* start / finish */}
      <group position={[p0.x, 0, p0.z]} rotation={[0, h0, 0]}>
        <mesh position={[0, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[TRACK_W, 1]} />
          <meshBasicMaterial map={checker} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * (H + 0.9), 2, 0]} castShadow>
            <boxGeometry args={[0.3, 4, 0.3]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 4.1, 0]}>
          <boxGeometry args={[TRACK_W + 2.2, 0.8, 0.25]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text font={fontBold} position={[0, 4.1, -0.14]} rotation={[0, Math.PI, 0]} fontSize={0.5} letterSpacing={0.18} color="#f43f5e" anchorX="center" anchorY="middle">START · FINISH</Text>
        <Text font={fontBold} position={[0, 4.1, 0.14]} fontSize={0.5} letterSpacing={0.18} color="#f43f5e" anchorX="center" anchorY="middle">START · FINISH</Text>
      </group>
      {/* checkpoints */}
      {track.cps.map((ci, k) => (
        <group key={k} position={[track.x[ci], 0, track.z[ci]]} rotation={[0, headingAt(ci), 0]}>
          {[-1, 1].map((sx) => (
            <mesh key={sx} position={[sx * (H + 0.7), 1.2, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 2.4, 8]} />
              <meshBasicMaterial ref={(m) => { if (sx === 1) cpMats.current[k] = m }} color={cpOff} toneMapped={false} />
            </mesh>
          ))}
          <Text font={fontBold} position={[H + 0.7, 2.7, 0]} rotation={[0, Math.PI, 0]} fontSize={0.38} color="#94a3b8" anchorX="center">{`CP${k + 1}`}</Text>
        </group>
      ))}
      <Text font={fontBold} position={[30.6, 0.03, -10]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={1.1} letterSpacing={0.2} color="#f43f5e" anchorX="center">TIME TRIAL</Text>
      <group ref={devRef} visible={false}><CarModel body="#fbbf24" accent="#fbbf24" reducedMotion ghost /></group>
      <group ref={youRef} visible={false}><CarModel body="#5eead4" accent="#5eead4" reducedMotion ghost /></group>
    </group>
  )
}
