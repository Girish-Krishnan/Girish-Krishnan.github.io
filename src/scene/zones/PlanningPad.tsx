import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line, Text, RoundedBox } from '@react-three/drei'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { PADS, robotState } from '../layout'
import { astar } from '../../algos/astar'
import { rrt, type Rect } from '../../algos/rrt'
import { on, useFeature } from '../../game/bus'
import { useGame } from '../../game/store'
import { toast } from '../../game/toasts'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const PAD = PADS.planning
const N = 16, RES = PAD.size / N
const X0 = PAD.x - PAD.size / 2, Z0 = PAD.z - PAD.size / 2
const START: [number, number] = [1, 1], GOAL: [number, number] = [14, 14]
const cellCenter = (i: number, j: number) => ({ x: X0 + (i + 0.5) * RES, z: Z0 + (j + 0.5) * RES })
const PRESET: [number, number][] = [[0, 7], [2, 7], [4, 7], [6, 7], [9, 3], [11, 10]]
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hitP = new THREE.Vector3()
const GOLD = '#fbbf24', VIOLET = '#c084fc'

type Plan =
  | { algo: 'astar'; expanded: [number, number][]; path: { x: number; z: number }[] }
  | { algo: 'rrt'; segs: Float32Array; nSegs: number; path: { x: number; z: number }[] }

export default function PlanningPad() {
  const [blocks, setBlocks] = useState<[number, number][]>(PRESET)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [reveal, setReveal] = useState(1)
  const dragging = useRef<number | null>(null)
  const bodies = useRef<(RapierRigidBody | null)[]>([])
  const following = useRef(false)
  const stuck = useRef({ t: 0, x: 0, z: 0 })
  const blocksRef = useRef(blocks)
  blocksRef.current = blocks
  const setF = useFeature((s) => s.set)

  // occupancy (blocks inflated by one cell for robot clearance)
  const blockedFn = (bl: [number, number][]) => {
    const m = new Uint8Array(N * N)
    for (const [bi, bj] of bl) for (let j = bj - 1; j <= bj + 2; j++) for (let i = bi - 1; i <= bi + 2; i++) if (i >= 0 && j >= 0 && i < N && j < N) m[j * N + i] = 1
    return (i: number, j: number) => m[j * N + i] === 1
  }

  useEffect(() => {
    blocks.forEach(([i, j], k) => {
      const c = cellCenter(i + 0.5, j + 0.5)
      bodies.current[k]?.setNextKinematicTranslation({ x: c.x, y: 0.5, z: c.z })
    })
  }, [blocks])

  useEffect(() => {
    const runA = () => {
      const blocked = blockedFn(blocksRef.current)
      const r = astar(N, N, blocked, START, GOAL)
      const path = r.path.map(([i, j]) => cellCenter(i, j))
      setPlan({ algo: 'astar', expanded: r.expanded, path })
      setReveal(0)
      useGame.getState().set({ plannerRan: { ...useGame.getState().plannerRan, astar: true } })
      setF('planner', { algo: 'astar', ms: r.ms, expanded: r.expanded.length, nodes: 0, length: pathLen(path), status: path.length ? `A*: ${r.expanded.length} cells expanded in ${r.ms.toFixed(1)} ms · path ${pathLen(path).toFixed(1)} m` : 'A*: no path! Drag a block out of the way.' })
    }
    const runR = () => {
      const obs: Rect[] = blocksRef.current.map(([i, j]) => ({ x0: X0 + i * RES - 0.85, z0: Z0 + j * RES - 0.85, x1: X0 + (i + 2) * RES + 0.85, z1: Z0 + (j + 2) * RES + 0.85 }))
      const r = rrt({ x0: X0 + 0.3, z0: Z0 + 0.3, x1: X0 + PAD.size - 0.3, z1: Z0 + PAD.size - 0.3 }, obs, cellCenter(...START), cellCenter(...GOAL))
      const segs = new Float32Array(r.nodes.length * 6)
      let n = 0
      r.nodes.forEach((nd) => {
        if (nd.parent < 0) return
        const p = r.nodes[nd.parent]
        segs.set([p.x, 0.06, p.z, nd.x, 0.06, nd.z], n * 6); n++
      })
      setPlan({ algo: 'rrt', segs, nSegs: n, path: r.path })
      setReveal(0)
      useGame.getState().set({ plannerRan: { ...useGame.getState().plannerRan, rrt: true } })
      setF('planner', { algo: 'rrt', ms: r.ms, expanded: 0, nodes: r.nodes.length, length: pathLen(r.path), status: r.path.length ? `RRT: ${r.nodes.length} nodes, ${r.iters} samples in ${r.ms.toFixed(1)} ms · path ${pathLen(r.path).toFixed(1)} m` : 'RRT: no path found in budget. Try again or move blocks.' })
    }
    const follow = () => {
      setPlan((p) => {
        if (!p || !p.path.length) { toast('No path yet', 'Run A* or RRT first.'); return p }
        robotState.autopilot = null
        robotState.path = p.path.map((q) => ({ ...q }))
        following.current = true
        setF('planner', { status: 'Following path…' })
        return p
      })
    }
    const shuffle = () => {
      const rnd: [number, number][] = []
      while (rnd.length < 6) {
        const c: [number, number] = [Math.floor(Math.random() * (N - 1)), Math.floor(Math.random() * (N - 1))]
        if (Math.abs(c[0] - START[0]) < 3 && Math.abs(c[1] - START[1]) < 3) continue
        if (Math.abs(c[0] - GOAL[0]) < 3 && Math.abs(c[1] - GOAL[1]) < 3) continue
        rnd.push(c)
      }
      setBlocks(rnd); setPlan(null); setF('planner', { status: 'Blocks shuffled. Run a planner.' })
    }
    const offs = [on('planner:astar', runA), on('planner:rrt', runR), on('planner:follow', follow), on('planner:shuffle', shuffle)]
    return () => offs.forEach((f) => f())
  }, [setF])

  useFrame((_, dt) => {
    if (following.current && robotState.path.length) {
      const k = stuck.current
      k.t += dt
      if (k.t > 2.5) {
        if (Math.hypot(robotState.pos.x - k.x, robotState.pos.z - k.z) < 0.3) {
          robotState.path = []; following.current = false
          setF('planner', { status: 'Stuck on an obstacle. Re-plan (RRT is random) or move a block.' })
        }
        k.t = 0; k.x = robotState.pos.x; k.z = robotState.pos.z
      }
    }
    if (reveal < 1) setReveal((r) => Math.min(1, r + dt / ((window as any).__reduced ? 0.01 : 1.4)))
    if (following.current && !robotState.path.length) {
      following.current = false
      const g = cellCenter(...GOAL)
      if (Math.hypot(robotState.pos.x - g.x, robotState.pos.z - g.z) < 1.2) {
        setF('planner', { status: 'Goal reached!' })
        const ran = useGame.getState().plannerRan
        if (ran.astar && ran.rrt) useGame.getState().complete('planner')
        else toast('Goal reached', `Now try ${ran.astar ? 'RRT' : 'A*'} too for the mission.`)
      }
    }
  })

  const onDown = (k: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    dragging.current = k
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (k: number) => (e: ThreeEvent<PointerEvent>) => {
    if (dragging.current !== k) return
    e.stopPropagation()
    if (!e.ray.intersectPlane(plane, hitP)) return
    const i = THREE.MathUtils.clamp(Math.round((hitP.x - X0) / RES - 1), 0, N - 2)
    const j = THREE.MathUtils.clamp(Math.round((hitP.z - Z0) / RES - 1), 0, N - 2)
    if (blocks[k][0] !== i || blocks[k][1] !== j) { setBlocks((b) => b.map((c, n) => (n === k ? [i, j] : c))); setPlan(null) }
  }
  const onUp = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); dragging.current = null; (e.target as Element).releasePointerCapture?.(e.pointerId) }

  const exp = plan?.algo === 'astar' ? plan.expanded : []
  const nExp = Math.floor(exp.length * reveal)
  const expRef = useRef<THREE.InstancedMesh>(null)
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const col = useMemo(() => new THREE.Color(), [])
  useEffect(() => {
    const im = expRef.current
    if (!im) return
    for (let k = 0; k < nExp; k++) {
      const c = cellCenter(exp[k][0], exp[k][1])
      m4.makeScale(RES * 0.86, 1, RES * 0.86).setPosition(c.x, 0.045, c.z)
      im.setMatrixAt(k, m4)
      col.setHSL(0.13 - 0.1 * (k / exp.length), 0.9, 0.35)
      im.setColorAt(k, col)
    }
    im.count = nExp
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
  }, [nExp, exp, m4, col])

  const segGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    if (plan?.algo === 'rrt') g.setAttribute('position', new THREE.BufferAttribute(plan.segs, 3))
    return g
  }, [plan])
  if (plan?.algo === 'rrt') segGeo.setDrawRange(0, Math.floor(plan.nSegs * reveal) * 2)
  const pathPts = plan && reveal >= 1 && plan.path.length > 1 ? plan.path.map((p) => new THREE.Vector3(p.x, 0.12, p.z)) : null
  const s0 = cellCenter(...START), g0 = cellCenter(...GOAL)
  const gridGeo = useMemo(() => {
    const v: number[] = []
    for (let k = 0; k <= N; k++) {
      v.push(X0 + k * RES, 0.03, Z0, X0 + k * RES, 0.03, Z0 + PAD.size)
      v.push(X0, 0.03, Z0 + k * RES, X0 + PAD.size, 0.03, Z0 + k * RES)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); return g
  }, [])
  const gold = useMemo(() => new THREE.Color(GOLD).multiplyScalar(2), [])

  return (
    <group>
      <mesh position={[PAD.x, 0.02, PAD.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={(e) => e.stopPropagation()}>
        <planeGeometry args={[PAD.size + 0.4, PAD.size + 0.4]} />
        <meshStandardMaterial color="#0d1320" roughness={0.6} metalness={0.3} />
      </mesh>
      <lineSegments geometry={gridGeo}><lineBasicMaterial color="#2b3a52" /></lineSegments>
      <mesh position={[PAD.x, 0.025, PAD.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[PAD.size * 0.705, PAD.size * 0.72, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={gold} toneMapped={false} />
      </mesh>
      <Text font={fontBold} position={[PAD.x, 0.04, Z0 - 0.7]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} letterSpacing={0.12} color={GOLD} anchorX="center">PLANNING PAD · A* / RRT</Text>
      {/* start + goal */}
      <mesh position={[s0.x, 0.05, s0.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.28, 0.36, 32]} /><meshBasicMaterial color="#5eead4" /></mesh>
      <group position={[g0.x, 0, g0.z]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.03, 1.2, 8]} /><meshStandardMaterial color="#cbd5e1" /></mesh>
        <mesh position={[0.22, 1.05, 0]}><boxGeometry args={[0.42, 0.26, 0.02]} /><meshBasicMaterial color={gold} toneMapped={false} /></mesh>
      </group>
      {/* blocks */}
      {blocks.map(([i, j], k) => {
        const c = cellCenter(i + 0.5, j + 0.5)
        return (
          <RigidBody key={k} ref={(r) => { bodies.current[k] = r }} type="kinematicPosition" position={[c.x, 0.5, c.z]} colliders="cuboid">
            <RoundedBox args={[RES * 2 - 0.06, 1, RES * 2 - 0.06]} radius={0.06} castShadow receiveShadow
              onPointerDown={onDown(k)} onPointerMove={onMove(k)} onPointerUp={onUp} onClick={(e) => e.stopPropagation()}
              onPointerOver={() => { document.body.style.cursor = 'grab' }} onPointerOut={() => { document.body.style.cursor = '' }}
            >
              <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.2} />
            </RoundedBox>
          </RigidBody>
        )
      })}
      {/* A* expansion */}
      <instancedMesh ref={expRef} args={[undefined, undefined, N * N]} frustumCulled={false}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshBasicMaterial transparent opacity={0.75} toneMapped={false} />
      </instancedMesh>
      {plan?.algo === 'rrt' && (
        <lineSegments geometry={segGeo}><lineBasicMaterial color={VIOLET} transparent opacity={0.8} /></lineSegments>
      )}
      {pathPts && <Line points={pathPts} color={plan!.algo === 'astar' ? GOLD : VIOLET} lineWidth={4} toneMapped={false} />}
    </group>
  )
}

function pathLen(p: { x: number; z: number }[]) {
  let L = 0
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].z - p[i - 1].z)
  return L
}
