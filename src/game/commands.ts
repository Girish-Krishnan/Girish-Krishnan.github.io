import { registerCommand, outLine as o, errLine as err, unlockedBy } from '../ui/terminalExtras'
import { emit, useFeature } from './bus'
import { useGame } from './store'
import { useSim } from '../store'
import { useRace } from './race'
import { auv, PID, DEPTH_MIN, DEPTH_MAX } from './auv'
import { weld, busy, setDrawn, presetPath, armJoints, type Preset } from './weld'

const goZone = (z: string) => { if (useSim.getState().zone !== z) useSim.getState().teleportTo(`zone:${z}`) }

registerCommand({
  name: 'slam', help: 'slam [on|off]       toggle the LiDAR SLAM view',
  run: ([a]) => {
    const g = useGame.getState()
    const next = a === 'on' ? true : a === 'off' ? false : !g.slam
    g.set({ slam: next })
    return [o(next ? `slam: lidar online · 40 beams/frame · ${Math.round(g.mapped * 100)}% of the lab mapped. drive around!` : 'slam: lidar off. the map is kept.')]
  },
})
registerCommand({ name: 'astar', help: 'astar | rrt         plan on the planning pad', run: () => { goZone('planning'); setTimeout(() => emit('planner:astar'), 50); return [o('a*: octile heuristic, 8-connected grid… planning.')] } })
registerCommand({ name: 'rrt', run: () => { goZone('planning'); setTimeout(() => emit('planner:rrt'), 50); return [o('rrt: sampling the free space… (goal bias 12%, then shortcut smoothing)')] } })
registerCommand({ name: 'follow', help: 'follow              drive the rover along the last plan', run: () => { emit('planner:follow'); return [o('follow: handing the path to the controller.')] } })
registerCommand({ name: 'push', help: 'push | lqr [on|off] poke the cart-pole / toggle LQR', run: () => { goZone('cartpole'); setTimeout(() => emit('cart:push'), 50); return [o('push: *boop*')] } })
registerCommand({ name: 'lqr', run: ([a]) => { goZone('cartpole'); emit('cart:mode', a); return [o(`lqr: controller ${a ?? 'toggled'}. K = -[k_x, k_ẋ, k_θ, k_θ̇] from the discrete Riccati equation.`)] } })
registerCommand({
  name: 'pid', secret: unlockedBy('balancer'),
  run: () => {
    const c = useFeature.getState().cart
    return [o(`pid: P = "push it", I = "it'll be fine", D = "don't touch it". current θ = ${(c.theta * 57.3).toFixed(2)}°. LQR is doing the real work.`)]
  },
})

registerCommand({ name: 'race', help: 'race | leaderboard  time trial + local leaderboard', run: () => { useSim.getState().openSheetFn('race'); return [o('race: opening the time-trial sheet.')] } })
registerCommand({ name: 'leaderboard', run: () => { useSim.getState().openSheetFn('race'); return [o('leaderboard: opening.')] } })
registerCommand({
  name: 'ghost', help: 'ghost [on|off]      show/hide lap ghosts',
  run: ([a]) => {
    const r = useRace.getState()
    const next = a === 'on' ? true : a === 'off' ? false : !r.ghosts
    r.set({ ghosts: next })
    return [o(`ghost: ${next ? 'ghosts visible. boo.' : 'ghosts hidden.'}`)]
  },
})
registerCommand({
  name: 'callsign', help: 'callsign <name>     set your leaderboard name',
  run: (args) => {
    const n = args.join(' ').replace(/[^\w .'-]/g, '').trim().slice(0, 16)
    if (!n) return [o(`callsign: you are '${useGame.getState().callsign}'.`)]
    useGame.getState().set({ callsign: n })
    return [o(`callsign: hello, ${n}.`)]
  },
})
registerCommand({ name: 'drs', run: () => [o('drs: flap open. (it does nothing. this is a time trial, there is no one to overtake.)')] })

// ---------- milestone 4: easter eggs ----------
registerCommand({
  name: 'launch', help: 'launch              light the candle at the launch pad',
  run: () => {
    const busy = useFeature.getState().launch.state !== 'idle'
    if (busy) return [err('launch: range is not clear. wait for the booster to land.')]
    goZone('launch')
    setTimeout(() => emit('launch:go'), 250)
    useSim.getState().setTerminal(false)
    return [o('launch: go for launch. T−3…')]
  },
})
const G: Record<string, number> = { earth: 1, moon: 0.165, mars: 0.38, jupiter: 2.53, pluto: 0.063, zero: 0.01 }
registerCommand({
  name: 'gravity', help: 'gravity <g|moon|mars|earth|jupiter>', secret: unlockedBy('konami'),
  run: ([a]) => {
    const g = useGame.getState()
    if (!a) return [o(`gravity: ${(g.lowGravity ? -g.gravity / 20 : 1).toFixed(3)} g. try 'gravity moon'.`)]
    const v = G[a.toLowerCase()] ?? parseFloat(a)
    if (!isFinite(v) || v <= 0 || v > 5) return [err('gravity: pick a positive number up to 5 (in g), or moon/mars/earth/jupiter/pluto')]
    g.set({ lowGravity: v !== 1, gravity: -20 * v })
    return [o(`gravity: ${v} g${v < 1 ? ' · press Space to hop' : ''}${a === 'jupiter' ? ' · oof' : ''}`)]
  },
})
// ---------- v2.4: weld cell (Argon Robotics-inspired) ----------
registerCommand({
  name: 'seam', help: 'seam <straight|L|curve>  load a seam preset at the weld cell',
  run: ([a]) => {
    const k = ({ straight: 'straight', l: 'L', 'l-joint': 'L', curve: 'curve' } as Record<string, Preset>)[(a ?? '').toLowerCase()]
    if (!k) return [err('usage: seam <straight|L|curve>')]
    if (busy()) return [err('seam: the cell is busy. wait for the arm.')]
    goZone('weld'); setDrawn(presetPath(k)); setTimeout(() => emit('weld:changed'), 50)
    return [o(`seam: ${k} joint chalked on the plate. next: \`detect\` or \`weld\`.`)]
  },
})
registerCommand({
  name: 'detect', help: 'detect              scan the plate (simulated CNN seam detector)',
  run: () => { goZone('weld'); setTimeout(() => emit('weld:detect'), 60); return [o('detect: laser line scan → depth map → seam (a simulated stand-in for a CNN).')] },
})
registerCommand({
  name: 'weld', help: 'weld                detect (if needed) and weld the seam',
  run: () => {
    if (busy()) return [err('weld: already busy.')]
    goZone('weld'); setTimeout(() => emit('weld:go'), 60); useSim.getState().setTerminal(false)
    return [o(weld.phase === 'idle' ? 'weld: no seam drawn, using a straight butt joint. scanning…' : 'weld: arc on. lower your visor.')]
  },
})
registerCommand({
  name: 'xarm', help: 'xarm                joint angles of the weld arm', secret: unlockedBy('weld'),
  run: () => {
    const d = armJoints.q.map((q, i) => `j${i + 1} ${(q * 57.2958).toFixed(1).padStart(6)}°`).join('  ')
    return [o(`xarm: ${d}\nmoveit: plan found in 0.00 s (it's closed-form IK; MoveIt2 would be jealous, then remind you about collisions.)`)]
  },
})
registerCommand({
  name: 'matrix', help: 'matrix              there is no spoon', secret: unlockedBy('secret'),
  run: () => { const g = useGame.getState(); g.set({ matrix: !g.matrix }); return [o(g.matrix ? 'matrix: unplugged.' : 'matrix: wake up, neo…')] },
})
registerCommand({ name: 'ping', run: () => [o('pong · 0.3 ms (everything runs in your browser)')] })
registerCommand({ name: 'coffee', run: () => [err('418 I’m a teapot')] })
registerCommand({ name: 'kalman', run: () => [o('kalman: prediction: you type `help` next. measurement: you didn’t. increasing process noise Q…')] })
registerCommand({ name: 'fourier', run: () => [o('fourier: everything is a sum of sines if you squint hard enough.')] })
registerCommand({ name: 'make', run: ([a]) => [a === 'sandwich' ? err('make: what? make it yourself.') : err(`make: *** No rule to make target '${a ?? 'all'}'. Stop.`)] })
registerCommand({ name: 'hello', run: () => [o('hello, world. (achievement unlocked: the first program everyone writes)')] })
registerCommand({ name: '42', run: () => [o('the answer. now you just need the question.')] })

// ---------- v2.1: AUV test tank ----------
registerCommand({
  name: 'sonar', help: 'sonar               ping the AUV sonar (in the tank)',
  run: () => {
    if (useGame.getState().vehicle !== 'auv') return [err('sonar: no transducer on this vehicle. try `vehicle auv` in the test tank.')]
    emit('sonar:ping')
    return [o('sonar: *ping*… listening for echoes.')]
  },
})
registerCommand({
  name: 'depth', help: 'depth <m|on|off>    AUV depth-hold setpoint (PID)',
  run: ([a]) => {
    if (!a) return [o(`depth: ${auv.depth.toFixed(2)} m · setpoint ${auv.setpoint.toFixed(2)} m · hold ${auv.hold ? 'on' : 'off'} · Kp ${PID.kp} Ki ${PID.ki} Kd ${PID.kd}`)]
    if (a === 'on' || a === 'off') { auv.hold = a === 'on'; auv.integ = 0; return [o(`depth: hold ${a}`)] }
    const m = parseFloat(a)
    if (!isFinite(m) || m < DEPTH_MIN || m > DEPTH_MAX) return [err(`depth: pick ${DEPTH_MIN}–${DEPTH_MAX} m (the tank is shallow)`)]
    auv.hold = true; auv.setpoint = m
    return [o(`depth: setpoint ${m.toFixed(2)} m. watch the PID settle.${useGame.getState().vehicle !== 'auv' ? ' (switch to the AUV to dive)' : ''}`)]
  },
})
