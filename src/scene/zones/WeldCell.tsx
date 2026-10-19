import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { PADS } from '../layout'
import { on, emit, useFeature } from '../../game/bus'
import { useGame } from '../../game/store'
import { toast } from '../../game/toasts'
import {
  weld, PLATE, CLEAN, SCAN_TIME, presetPath, setDrawn, addDrawnPoint, detect, trackStep, seamAt, resetRun, busy,
  pathLength, armJoints, type Pt, type Preset,
} from '../../game/weld'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'
import fontMed from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff?url'

/**
 * Weld seam challenge: draw a seam on the plate, run a (simulated) CNN seam detector, then a
 * 6-DOF arm tracks it with analytic IK and lays a bead. Inspired by Girish's Argon Robotics work.
 */
const PAD = PADS.weld
const ROT = Math.atan2(-PAD.x, -PAD.z) // local +Z faces the lab centre (the visitor)
const PLATE_TOP = 0.86
const PZ = 0.35 // plate centre (local z)
const ARM_Z = -0.95 // arm base (local z), behind the plate
const PED_H = 0.62
const SHOULDER_Y = PED_H + 0.06 + 0.32
const L1 = 1.1, L2 = 1.0, TOOL = 0.42
const STANDOFF = 0.03
const HOME = new THREE.Vector3(0, PLATE_TOP + 0.55, PZ - 0.25)
const MAX_BEAD = 600

const toLocal = (p: Pt, y = PLATE_TOP) => new THREE.Vector3(p.u, y, PZ + p.v)

/** Flat ribbon along a plate-space polyline. */
function ribbon(pts: Pt[], width: number, y: number) {
  const g = new THREE.BufferGeometry()
  if (pts.length < 2) return g
  const pos: number[] = [], idx: number[] = []
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
    let tu = b.u - a.u, tv = b.v - a.v
    const l = Math.hypot(tu, tv) || 1; tu /= l; tv /= l
    const nu = -tv * width / 2, nv = tu * width / 2
    pos.push(p.u + nu, y, PZ + p.v + nv, p.u - nu, y, PZ + p.v - nv)
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k) }
  })
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  return g
}

/** Analytic IK for an xArm-ish 6-DOF arm with the torch pointing straight down. */
function solveIK(tip: THREE.Vector3) {
  const wx = tip.x, wy = tip.y + TOOL, wz = tip.z - ARM_Z
  const j1 = Math.atan2(wx, wz)
  const r = Math.hypot(wx, wz), h = wy - SHOULDER_Y
  const D = THREE.MathUtils.clamp(Math.hypot(r, h), Math.abs(L1 - L2) + 0.05, L1 + L2 - 0.001)
  const gamma = Math.atan2(r, h)
  const beta = Math.acos(THREE.MathUtils.clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1))
  const j2 = gamma - beta // elbow up
  const j3 = Math.acos(THREE.MathUtils.clamp((D * D - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1))
  const j5 = Math.PI - j2 - j3
  return [j1, j2, j3, 0, j5, 0]
}

const white = { color: '#e8ecf1', roughness: 0.32, metalness: 0.15 }
const dark = { color: '#2b3340', roughness: 0.45, metalness: 0.6 }

function JointCap({ r = 0.13, w = 0.24 }: { r?: number; w?: number }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[r, r, w, 24]} /><meshStandardMaterial {...dark} /></mesh>
      <mesh><cylinderGeometry args={[r * 0.55, r * 0.55, w + 0.01, 20]} /><meshStandardMaterial color="#f97316" roughness={0.4} /></mesh>
    </group>
  )
}

function Sparks({ tip, active }: { tip: React.MutableRefObject<THREE.Vector3>; active: React.MutableRefObject<boolean> }) {
  const N = 140
  const st = useMemo(() => ({ p: new Float32Array(N * 3), v: new Float32Array(N * 3), life: new Float32Array(N), next: 0 }), [])
  const geo = useMemo(() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(st.p, 3)); return g }, [st])
  const col = useMemo(() => new THREE.Color('#fdba74').multiplyScalar(3), [])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    if (active.current) {
      for (let k = 0; k < 6; k++) {
        const i = st.next; st.next = (st.next + 1) % N
        st.p.set([tip.current.x, tip.current.y, tip.current.z], i * 3)
        const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 2.2
        st.v.set([Math.cos(a) * s, 1 + Math.random() * 2.2, Math.sin(a) * s], i * 3)
        st.life[i] = 0.25 + Math.random() * 0.45
      }
    }
    for (let i = 0; i < N; i++) {
      if (st.life[i] <= 0) { st.p[i * 3 + 1] = -50; continue }
      st.life[i] -= dt
      st.v[i * 3 + 1] -= 9.8 * dt
      st.p[i * 3] += st.v[i * 3] * dt; st.p[i * 3 + 1] += st.v[i * 3 + 1] * dt; st.p[i * 3 + 2] += st.v[i * 3 + 2] * dt
      if (st.p[i * 3 + 1] < PLATE_TOP && Math.abs(st.p[i * 3]) < 0.95 && Math.abs(st.p[i * 3 + 2] - PZ) < 0.65) { st.p[i * 3 + 1] = PLATE_TOP; st.v[i * 3 + 1] *= -0.3 }
    }
    geo.attributes.position.needsUpdate = true
  })
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial color={col} size={0.035} transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  )
}

export default function WeldCell({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const J = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)]
  const tip = useRef(HOME.clone())
  const arcOn = useRef(false)
  const light = useRef<THREE.PointLight>(null)
  const arcGlow = useRef<THREE.Mesh>(null)
  const laser = useRef<THREE.Group>(null)
  const beadMesh = useRef<THREE.InstancedMesh>(null)
  const cloud = useRef<THREE.Points>(null)
  const [ver, setVer] = useState(0)
  const st = useRef({ drawing: false, uiT: 0, lastBead: null as Pt | null, auto: false, t: 0, from: HOME.clone() })
  const setF = useFeature((s) => s.set)
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    // test hook: plate (u, v) → CSS pixel position on screen
    const w = window as unknown as { __simlab?: Record<string, unknown> }
    if (!w.__simlab) return
    w.__simlab.weldPlateToScreen = (u: number, v: number) => {
      const p = group.current!.localToWorld(toLocal({ u, v }, PLATE_TOP)).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }
    }
  }, [camera, gl])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const tmpC = useMemo(() => new THREE.Color(), [])
  const hot = useMemo(() => [new THREE.Color('#fff7d6').multiplyScalar(3), new THREE.Color('#fb923c').multiplyScalar(2.2), new THREE.Color('#9a3412'), new THREE.Color('#6b7280')], [])

  // the scan's point cloud: plate grid with a groove where the seam is (depth exaggerated for display)
  const cloudGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const NU = 72, NV = 45
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NU * NV * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(NU * NV * 3), 3))
    g.userData = { NU, NV }
    g.setDrawRange(0, 0)
    return g
  }, [])
  const buildCloud = () => {
    const { NU, NV } = cloudGeo.userData as { NU: number; NV: number }
    const pos = cloudGeo.attributes.position as THREE.BufferAttribute, colA = cloudGeo.attributes.color as THREE.BufferAttribute
    const P = weld.drawn
    const c0 = new THREE.Color('#0ea5e9'), c1 = new THREE.Color('#facc15'), c2 = new THREE.Color('#ef4444')
    let k = 0
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const u = -PLATE.w / 2 + ((i + 0.5) / NU) * PLATE.w, v = -PLATE.h / 2 + ((j + 0.5) / NV) * PLATE.h
      let d = Infinity
      for (let n = 1; n < P.length; n++) {
        const a = P[n - 1], b = P[n], du = b.u - a.u, dv = b.v - a.v, l2 = du * du + dv * dv || 1e-9
        const t = Math.max(0, Math.min(1, ((u - a.u) * du + (v - a.v) * dv) / l2))
        d = Math.min(d, Math.hypot(u - a.u - du * t, v - a.v - dv * t))
      }
      const groove = Math.exp(-((d / 0.022) ** 2)) // 0..1
      pos.setXYZ(k, u, PLATE_TOP + 0.03 - groove * 0.025, PZ + v)
      tmpC.copy(c0).lerp(groove > 0.5 ? c2 : c1, Math.min(1, groove * 1.6))
      colA.setXYZ(k, tmpC.r, tmpC.g, tmpC.b)
      k++
    }
    pos.needsUpdate = true; colA.needsUpdate = true
    cloudGeo.setDrawRange(0, 0)
  }

  const drawnGeo = useMemo(() => ribbon(weld.drawn, 0.014, PLATE_TOP + 0.003), [ver]) // eslint-disable-line react-hooks/exhaustive-deps
  const seamGeo = useMemo(() => ribbon(weld.seam, 0.022, PLATE_TOP + 0.006), [ver]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { drawnGeo.dispose() }, [drawnGeo])
  useEffect(() => () => { seamGeo.dispose() }, [seamGeo])

  const pushUi = () => setF('weld', { phase: weld.phase, confidence: weld.confidence, quality: weld.quality, rms: weld.rmsMm, max: weld.maxMm, progress: weld.phase === 'scanning' ? weld.scan : weld.seam.length > 1 ? weld.s / ((weld.seam.length - 1) * 0.01) : 0, version: weld.version })

  useEffect(() => {
    const startScan = () => {
      if (busy()) return
      if (weld.drawn.length < 2 || pathLength(weld.drawn) < 0.2) { toast('No seam to scan', 'Draw a seam on the plate or pick a preset.'); return }
      detect(); buildCloud()
      weld.phase = 'scanning'; weld.scan = 0; resetRun(); weld.version++
      pushUi()
    }
    const startWeld = () => {
      if (busy()) return
      if (weld.phase === 'idle') { setDrawn(presetPath('straight')); st.current.auto = true; startScan(); return }
      if (weld.phase === 'drawn') { st.current.auto = true; startScan(); return }
      resetRun()
      weld.phase = 'welding'; weld.stage = 'approach'; weld.stageT = 0
      st.current.from.copy(tip.current); st.current.lastBead = null
      weld.tool = { ...weld.seam[0] }; weld.vel = { u: 0, v: 0 }
      if (beadMesh.current) beadMesh.current.count = 0
      weld.version++
      pushUi()
    }
    const preset = (k?: unknown) => { if (busy()) return; setDrawn(presetPath((k as Preset) ?? 'straight')); if (beadMesh.current) beadMesh.current.count = 0; cloudGeo.setDrawRange(0, 0); pushUi() }
    const clear = () => { if (busy()) return; setDrawn([]); weld.bead = []; if (beadMesh.current) beadMesh.current.count = 0; cloudGeo.setDrawRange(0, 0); pushUi() }
    const changed = () => { if (beadMesh.current) beadMesh.current.count = 0; cloudGeo.setDrawRange(0, 0); pushUi() }
    const offs = [on('weld:detect', startScan), on('weld:go', startWeld), on('weld:preset', preset), on('weld:clear', clear), on('weld:changed', changed)]
    pushUi()
    return () => offs.forEach((f) => f())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- freehand drawing on the plate ----
  const plateUV = (e: ThreeEvent<PointerEvent>): Pt => {
    const p = group.current!.worldToLocal(e.point.clone())
    return { u: p.x, v: p.z - PZ }
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (busy()) return
    ;(e.target as unknown as Element).setPointerCapture?.(e.pointerId)
    st.current.drawing = true
    setDrawn([plateUV(e)])
    if (beadMesh.current) beadMesh.current.count = 0
    cloudGeo.setDrawRange(0, 0)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => { if (st.current.drawing) { e.stopPropagation(); addDrawnPoint(plateUV(e)) } }
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!st.current.drawing) return
    e.stopPropagation()
    st.current.drawing = false
    ;(e.target as unknown as Element).releasePointerCapture?.(e.pointerId)
    setDrawn(weld.drawn)
    if (weld.phase !== 'drawn') toast('Seam too short', 'Drag a longer path across the plate, or pick a preset.')
    pushUi()
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20)
    const s = st.current
    if (ver !== weld.version) setVer(weld.version)
    const target = new THREE.Vector3()
    arcOn.current = false
    if (weld.phase === 'scanning') {
      weld.scan = Math.min(1, weld.scan + dt / SCAN_TIME)
      const u = -PLATE.w / 2 + 0.05 + weld.scan * (PLATE.w - 0.1)
      target.set(u, PLATE_TOP + 0.45, PZ)
      tip.current.lerp(target, 1 - Math.exp(-10 * dt))
      if (laser.current) { laser.current.visible = true; laser.current.position.set(tip.current.x, 0, 0) }
      const { NU, NV } = cloudGeo.userData as { NU: number; NV: number }
      cloudGeo.setDrawRange(0, Math.floor(THREE.MathUtils.clamp((tip.current.x + PLATE.w / 2) / PLATE.w, 0, 1) * NU) * NV)
      if (weld.scan >= 1) {
        weld.phase = 'detected'; weld.version++
        cloudGeo.setDrawRange(0, NU * NV)
        toast('Seam detected', `Simulated CNN detector · confidence ${(weld.confidence * 100).toFixed(0)}%${weld.confidence < 0.75 ? ' · shaky seam, the bead may suffer' : ''}`, 'info')
        pushUi()
        if (s.auto) { s.auto = false; setTimeout(() => emit('weld:go'), 300) }
      }
    } else {
      if (laser.current) laser.current.visible = false
    }
    if (weld.phase === 'welding') {
      weld.stageT += dt
      if (weld.stage === 'approach') {
        const a = toLocal(weld.seam[0], PLATE_TOP + STANDOFF)
        const k = Math.min(1, weld.stageT / 1.1)
        const e = k * k * (3 - 2 * k)
        target.lerpVectors(s.from, a, e)
        target.y += Math.sin(Math.PI * e) * 0.18
        tip.current.copy(target)
        if (k >= 1) { weld.stage = 'track'; weld.stageT = 0 }
      } else if (weld.stage === 'track') {
        let done = false
        const n = Math.max(1, Math.ceil(dt / (1 / 120)))
        for (let i = 0; i < n && !done; i++) done = trackStep(dt / n)
        tip.current.copy(toLocal(weld.tool, PLATE_TOP + STANDOFF))
        arcOn.current = true
        // deposit bead every 5 mm of torch travel
        const lb = s.lastBead
        if (!lb || Math.hypot(weld.tool.u - lb.u, weld.tool.v - lb.v) > 0.005) {
          if (weld.bead.length < MAX_BEAD) weld.bead.push({ u: weld.tool.u, v: weld.tool.v, t: performance.now() })
          s.lastBead = { ...weld.tool }
        }
        if (done) {
          weld.stage = 'retract'; weld.stageT = 0; s.from.copy(tip.current)
          const g = useGame.getState()
          const q = weld.quality
          if (q > g.weldBest) g.set({ weldBest: q })
          const clean = q >= CLEAN
          toast(clean ? 'Clean weld!' : 'Weld complete', `Bead quality ${q.toFixed(0)}/100 · tracking error ${weld.rmsMm.toFixed(1)} mm rms${clean ? '' : ` · need ${CLEAN} for a clean weld`}`, clean ? 'info' : 'warn')
          if (clean) g.complete('weld')
        }
      } else {
        const k = Math.min(1, weld.stageT / 0.9)
        target.lerpVectors(s.from, HOME, k * k * (3 - 2 * k))
        tip.current.copy(target)
        if (k >= 1) { weld.phase = 'done'; weld.version++; pushUi() }
      }
    } else if (weld.phase !== 'scanning') {
      tip.current.lerp(HOME, 1 - Math.exp(-3 * dt))
    }

    // IK → joints
    const q = solveIK(tip.current)
    q[5] = weld.phase === 'welding' && !reducedMotion ? Math.sin(performance.now() / 120) * 0.4 : 0
    armJoints.q = q
    J[0].current!.rotation.y = q[0]
    J[1].current!.rotation.x = q[1]
    J[2].current!.rotation.x = q[2]
    J[3].current!.rotation.y = q[3]
    J[4].current!.rotation.x = q[4]
    J[5].current!.rotation.y = q[5]

    // arc light + glow
    if (light.current) {
      light.current.position.copy(tip.current)
      light.current.intensity = arcOn.current ? (reducedMotion ? 3 : 3 + Math.random() * 6) : 0
    }
    if (arcGlow.current) { arcGlow.current.visible = arcOn.current; arcGlow.current.position.copy(tip.current) }

    // bead: cools white → orange → dark red → grey
    const bm = beadMesh.current
    if (bm) {
      const now = performance.now()
      bm.count = weld.bead.length
      for (let i = 0; i < weld.bead.length; i++) {
        const b = weld.bead[i]
        const age = (now - b.t) / 1000
        if (age > 6 && i < weld.bead.length - 400) continue
        m4.makeScale(1, 0.55, 1).setPosition(b.u, PLATE_TOP + 0.006, PZ + b.v)
        bm.setMatrixAt(i, m4)
        const k = Math.min(3, age / 1.4)
        const i0 = Math.floor(k), f = k - i0
        tmpC.copy(hot[i0]).lerp(hot[Math.min(3, i0 + 1)], f)
        bm.setColorAt(i, tmpC)
      }
      bm.instanceMatrix.needsUpdate = true
      if (bm.instanceColor) bm.instanceColor.needsUpdate = true
    }
    s.uiT += dt
    if (s.uiT > 0.12 && busy()) { s.uiT = 0; pushUi() }
  })

  const sign = useMemo(() => new THREE.Color('#fb923c').multiplyScalar(1.3), [])
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[PAD.x, 0, PAD.z]} rotation={[0, ROT, 0]}>
        <CuboidCollider args={[1.0, 0.45, 0.7]} position={[0, 0.45, PZ]} />
        <CuboidCollider args={[0.35, 0.5, 0.35]} position={[0, 0.5, ARM_Z]} />
      </RigidBody>
      <group ref={group} position={[PAD.x, 0, PAD.z]} rotation={[0, ROT, 0]}>
        {/* floor decal + safety markings */}
        <mesh position={[0, 0.012, -0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[4.6, 3.6]} /><meshStandardMaterial color="#10151f" roughness={0.9} />
        </mesh>
        {[[-2.3, -0.1, 0.06, 3.6], [2.3, -0.1, 0.06, 3.6], [0, -1.9, 4.66, 0.06], [0, 1.7, 4.66, 0.06]].map(([x, z, w, d], i) => (
          <mesh key={i} position={[x, 0.016, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w, d]} /><meshBasicMaterial color={sign} toneMapped={false} /></mesh>
        ))}
        {/* welding table */}
        <mesh position={[0, PLATE_TOP - 0.07, PZ]} castShadow receiveShadow><boxGeometry args={[1.95, 0.06, 1.3]} /><meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.5} /></mesh>
        {[[-0.88, -0.55], [0.88, -0.55], [-0.88, 0.55], [0.88, 0.55]].map(([x, z], i) => (
          <mesh key={i} position={[x, (PLATE_TOP - 0.1) / 2, PZ + z]} castShadow><boxGeometry args={[0.07, PLATE_TOP - 0.1, 0.07]} /><meshStandardMaterial {...dark} /></mesh>
        ))}
        {/* two steel plates butted together, with a small bevel gap */}
        {[-1, 1].map((sd) => (
          <mesh key={sd} position={[0, PLATE_TOP - 0.02, PZ + sd * 0.2515]} castShadow receiveShadow>
            <boxGeometry args={[PLATE.w, 0.04, PLATE.h / 2 - 0.003]} />
            <meshStandardMaterial color="#a3acb9" metalness={0.85} roughness={0.38} />
          </mesh>
        ))}
        <mesh position={[0, PLATE_TOP - 0.004, PZ]}><boxGeometry args={[PLATE.w, 0.01, 0.006]} /><meshBasicMaterial color="#0b0f17" /></mesh>
        {/* drawing surface (invisible hit target) */}
        <mesh position={[0, PLATE_TOP + 0.002, PZ]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onClick={(e) => e.stopPropagation()}
          onPointerOver={() => { document.body.style.cursor = 'crosshair' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <planeGeometry args={[PLATE.w, PLATE.h]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {/* soapstone mark (drawn path) and detected seam */}
        <mesh geometry={drawnGeo} visible={weld.phase === 'drawn' || weld.phase === 'idle' || weld.phase === 'scanning'}>
          <meshBasicMaterial color="#f8fafc" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={seamGeo} visible={weld.phase === 'detected' || weld.phase === 'done' || weld.phase === 'welding'}>
          <meshBasicMaterial color={new THREE.Color('#4ade80').multiplyScalar(2)} transparent opacity={weld.phase === "detected" ? 0.9 : 0.35} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {weld.phase === 'detected' && (
          <Text font={fontMed} position={[0, PLATE_TOP + 0.62, PZ + 0.55]} fontSize={0.09} color="#86efac" anchorX="center" outlineWidth={0.004} outlineColor="#000">
            {`SEAM · simulated CNN · ${(weld.confidence * 100).toFixed(0)}%`}
          </Text>
        )}
        {/* scan point cloud */}
        <points ref={cloud} geometry={cloudGeo} visible={weld.phase === 'scanning' || weld.phase === 'detected'} frustumCulled={false}>
          <pointsMaterial size={0.018} vertexColors transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </points>
        {/* laser line projector sweep */}
        <group ref={laser} visible={false}>
          <mesh position={[0, PLATE_TOP + 0.004, PZ]}><boxGeometry args={[0.006, 0.004, PLATE.h]} /><meshBasicMaterial color={new THREE.Color('#ef4444').multiplyScalar(3)} toneMapped={false} /></mesh>
          <mesh position={[0, PLATE_TOP + 0.22, PZ]} rotation={[0, Math.PI / 2, 0]}>
            <shapeGeometry args={[new THREE.Shape([new THREE.Vector2(-PLATE.h / 2, -0.22), new THREE.Vector2(PLATE.h / 2, -0.22), new THREE.Vector2(0, 0.22)])]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
        {/* bead */}
        <instancedMesh ref={beadMesh} args={[undefined, undefined, MAX_BEAD]} frustumCulled={false}>
          <sphereGeometry args={[0.013, 10, 8]} />
          <meshStandardMaterial roughness={0.5} metalness={0.4} toneMapped={false} />
        </instancedMesh>
        <mesh ref={arcGlow} visible={false}><sphereGeometry args={[0.03, 12, 10]} /><meshBasicMaterial color={new THREE.Color('#e0f2fe').multiplyScalar(4)} toneMapped={false} /></mesh>
        <pointLight ref={light} color="#bfdbfe" intensity={0} distance={4} />
        {!reducedMotion && <Sparks tip={tip} active={arcOn} />}

        {/* the arm: pedestal → j1 base yaw → j2 shoulder → j3 elbow → j4 roll → j5 wrist pitch → j6 roll + torch */}
        <group position={[0, 0, ARM_Z]}>
          <mesh position={[0, PED_H / 2, 0]} castShadow receiveShadow><boxGeometry args={[0.55, PED_H, 0.55]} /><meshStandardMaterial color="#334155" metalness={0.5} roughness={0.5} /></mesh>
          <mesh position={[0, PED_H + 0.03, 0]}><cylinderGeometry args={[0.24, 0.26, 0.06, 28]} /><meshStandardMaterial {...dark} /></mesh>
          <group ref={J[0]} position={[0, PED_H + 0.06, 0]}>
            <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.17, 0.2, 0.32, 28]} /><meshStandardMaterial {...white} /></mesh>
            <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.205, 0.205, 0.03, 28]} /><meshStandardMaterial color="#f97316" /></mesh>
            <group ref={J[1]} position={[0, 0.32, 0]}>
              <JointCap />
              <mesh position={[0, L1 / 2, 0]} castShadow><capsuleGeometry args={[0.085, L1 - 0.17, 6, 16]} /><meshStandardMaterial {...white} /></mesh>
              <group ref={J[2]} position={[0, L1, 0]}>
                <JointCap r={0.11} w={0.21} />
                <mesh position={[0, L2 / 2, 0]} castShadow><capsuleGeometry args={[0.07, L2 - 0.14, 6, 16]} /><meshStandardMaterial {...white} /></mesh>
                <group ref={J[3]} position={[0, L2, 0]}>
                  <group ref={J[4]}>
                    <JointCap r={0.075} w={0.16} />
                    <group ref={J[5]}>
                      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.06, 0.06, 0.12, 18]} /><meshStandardMaterial {...dark} /></mesh>
                      <mesh position={[0, 0.19, 0]} rotation={[0.25, 0, 0]}><cylinderGeometry args={[0.028, 0.035, 0.18, 14]} /><meshStandardMaterial color="#374151" metalness={0.7} roughness={0.35} /></mesh>
                      <mesh position={[0, TOOL - 0.06, 0.02]} rotation={[0.25, 0, 0]}><cylinderGeometry args={[0.012, 0.03, 0.12, 14]} /><meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.25} /></mesh>
                      {/* cable */}
                      <mesh position={[0.07, 0.15, -0.03]} rotation={[0, 0, 0.3]}><torusGeometry args={[0.09, 0.012, 6, 16, Math.PI]} /><meshStandardMaterial color="#111827" roughness={0.8} /></mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* floor sign + a hint for the secret room behind */}
        <Text font={fontBold} position={[0, 0.03, 2.05]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.3} letterSpacing={0.12} color="#fb923c" anchorX="center">
          WELD CELL · SEAM DETECTION + IK
        </Text>
        <Text font={fontMed} position={[0, 0.03, 2.4]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.16} letterSpacing={0.14} color="#94a3b8" anchorX="center">
          DRAW A SEAM ON THE PLATE · DETECT · WELD
        </Text>
        <Text font={fontBold} position={[-1.9, 0.03, -2.3]} rotation={[-Math.PI / 2, 0, 0.5]} fontSize={0.2} color="#64748b" anchorX="center">
          the glass back here sounds hollow…
        </Text>
      </group>
    </>
  )
}
