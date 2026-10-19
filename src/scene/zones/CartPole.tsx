import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { PADS } from '../layout'
import { CP, rk4, lqrGain } from '../../algos/cartpole'
import { on, useFeature } from '../../game/bus'
import { useGame } from '../../game/store'
import { toast } from '../../game/toasts'
import fontBold from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url'

const PAD = PADS.cartpole
const SCALE = 1.25 // visual scale (sim is in metres; model is a bit bigger to read from the camera)
const POLE = CP.l * 2
const TEAL = '#5eead4'

/** Cart-pole balanced by discrete-time LQR (gain computed in-browser from a Riccati iteration). */
export default function CartPole() {
  const K = useMemo(() => lqrGain(), [])
  const sim = useRef({ s: [0, 0, 0.05, 0], u: 0, acc: 0, ctrlAcc: 0, uiAcc: 0, hist: [] as number[], push: null as null | { t: number; max: number }, time: 0 })
  const cart = useRef<THREE.Group>(null)
  const pole = useRef<THREE.Group>(null)
  const arrow = useRef<THREE.Mesh>(null)
  const setF = useFeature((s) => s.set)
  const tealC = useMemo(() => new THREE.Color(TEAL).multiplyScalar(2.2), [])
  const redC = useMemo(() => new THREE.Color('#fb7185').multiplyScalar(2), [])
  const tipMat = useRef<THREE.MeshBasicMaterial>(null)

  useEffect(() => {
    const st = sim.current
    const push = (arg?: unknown) => {
      const dir = arg === -1 || arg === 1 ? arg : Math.random() < 0.5 ? -1 : 1
      st.s[3] += dir * (1.3 + Math.random() * 0.6)
      st.push = { t: st.time, max: 0 }
      if (arrow.current) { arrow.current.visible = true; arrow.current.scale.y = dir; (arrow.current.userData.until = st.time + 0.6) }
    }
    const mode = (arg?: unknown) => {
      const cur = useFeature.getState().cart.mode
      const next = arg === 'lqr' || arg === 'off' ? arg : cur === 'lqr' ? 'off' : 'lqr'
      setF('cart', { mode: next as 'lqr' | 'off' })
      if (next === 'lqr' && Math.abs(st.s[2]) > 0.5) reset()
    }
    const reset = () => { st.s = [0, 0, 0.08, 0]; st.push = null; setF('cart', { fallen: false }) }
    const offs = [on('cart:push', push), on('cart:mode', mode), on('cart:reset', reset)]
    return () => offs.forEach((f) => f())
  }, [setF])

  useFrame((_, dtRaw) => {
    const st = sim.current
    const dt = Math.min(dtRaw, 0.05)
    st.acc += dt
    const mode = useFeature.getState().cart.mode
    while (st.acc >= CP.dt) {
      st.acc -= CP.dt
      st.time += CP.dt
      st.ctrlAcc += CP.dt
      if (st.ctrlAcc >= CP.ctrlDt - 1e-9) {
        st.ctrlAcc -= CP.ctrlDt
        const s = st.s
        st.u = mode === 'lqr' && Math.abs(s[2]) < 1.0 ? Math.max(-CP.uMax, Math.min(CP.uMax, -(K[0] * s[0] + K[1] * s[1] + K[2] * s[2] + K[3] * s[3]))) : 0
      }
      let s = rk4(st.s, st.u, CP.dt)
      if (Math.abs(s[0]) > CP.track) { s[0] = Math.sign(s[0]) * CP.track; s[1] *= -0.3 }
      if (Math.abs(s[2]) > Math.PI / 2 + 0.05) { s = [s[0], s[1] * 0.9, Math.sign(s[2]) * (Math.PI / 2 + 0.05), 0] }
      st.s = s
    }
    const [x, , th] = st.s
    if (cart.current) cart.current.position.x = x * SCALE
    if (pole.current) pole.current.rotation.z = -th
    const fallen = Math.abs(th) > 1.2
    tipMat.current?.color.copy(fallen ? redC : tealC)
    if (arrow.current?.visible && st.time > arrow.current.userData.until) arrow.current.visible = false
    if (st.push) {
      st.push.max = Math.max(st.push.max, Math.abs(th))
      const age = st.time - st.push.t
      if (age > 1.5 && Math.abs(th) < 0.06 && st.push.max < 1.0 && mode === 'lqr') {
        st.push = null
        const g = useGame.getState()
        const n = g.pushes + 1
        g.set({ pushes: n })
        if (n >= 5) g.complete('balancer')
        else if (n === 1) toast('Recovered!', 'LQR caught it. 4 more recoveries for the mission.')
      } else if (age > 8) st.push = null
    }
    st.uiAcc += dt
    if (st.uiAcc > 0.1) {
      st.uiAcc = 0
      st.hist.push(th)
      if (st.hist.length > 80) st.hist.shift()
      setF('cart', { theta: th, x, fallen, history: st.hist.slice() })
    }
  })

  return (
    <group position={[PAD.x, 0, PAD.z]} rotation={[0, PAD.rotY, 0]}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[CP.track * SCALE + 0.5, 0.5, 0.7]} position={[0, 0.5, 0]} />
      </RigidBody>
      {/* plinth */}
      <RoundedBox args={[(CP.track * SCALE + 0.5) * 2, 0.3, 1.4]} radius={0.08} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.4} />
      </RoundedBox>
      {/* rail */}
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, CP.track * SCALE * 2 + 0.6, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (CP.track * SCALE + 0.35), 0.5, 0]} castShadow>
          <boxGeometry args={[0.12, 0.4, 0.5]} />
          <meshStandardMaterial color="#fb7185" />
        </mesh>
      ))}
      <group ref={cart} position={[0, 0.55, 0]}>
        <RoundedBox args={[0.7, 0.3, 0.55]} radius={0.06} castShadow>
          <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0, 0.28]}><boxGeometry args={[0.5, 0.06, 0.01]} /><meshBasicMaterial color={tealC} toneMapped={false} /></mesh>
        <group ref={pole} position={[0, 0.15, 0]}>
          <mesh position={[0, (POLE * SCALE) / 2, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, POLE * SCALE, 10]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, POLE * SCALE, 0]}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshBasicMaterial ref={tipMat} color={tealC} toneMapped={false} />
          </mesh>
        </group>
        <mesh ref={arrow} visible={false} position={[0, 1.0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.12, 0.35, 12]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>
      <Text font={fontBold} position={[Math.sin(-PAD.rotY) * 2.5, 0.02, Math.cos(-PAD.rotY) * 2.5]} rotation={[-Math.PI / 2, 0, -PAD.rotY]} fontSize={0.36} letterSpacing={0.12} color={TEAL} anchorX="center">CART-POLE · DISCRETE-TIME LQR</Text>
    </group>
  )
}
