import { useEffect, useRef, useState } from 'react'
import { auv, PID, BEACONS, ACOUSTIC_DEPTHS, DEPTH_MAX } from '../game/auv'
import { weld, PLATE, CLEAN, PRESETS, busy, setDrawn, addDrawnPoint } from '../game/weld'
import { useSim } from '../store'
import { useCoarsePointer } from '../hooks'
import { useFeature, emit } from '../game/bus'
import { useGame } from '../game/store'

const GH = 'https://github.com/Girish-Krishnan/'

function Spark({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(148,170,200,0.25)'
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 1.5
    ctx.beginPath()
    data.forEach((v, i) => {
      const x = (i / 79) * w, y = h / 2 - Math.max(-1, Math.min(1, v / 0.6)) * (h / 2 - 2)
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
    })
    ctx.stroke()
  }, [data])
  return <canvas ref={ref} width={220} height={44} className="spark" aria-hidden="true" />
}

function Planner() {
  const p = useFeature((s) => s.planner)
  const ran = useGame((s) => s.plannerRan)
  return (
    <>
      <header><span className="zw-dot" style={{ background: '#fbbf24' }} /> <strong>Planning pad</strong></header>
      <p className="zw-status mono" aria-live="polite">{p.status}</p>
      <div className="zw-row">
        <button onClick={() => emit('planner:astar')} className={ran.astar ? 'done' : ''}>Run A*</button>
        <button onClick={() => emit('planner:rrt')} className={ran.rrt ? 'done' : ''}>Run RRT</button>
        <button onClick={() => emit('planner:follow')} className="primary">Follow path</button>
        <button onClick={() => emit('planner:shuffle')} aria-label="Shuffle obstacles">⟳</button>
      </div>
      <p className="zw-foot">Drag the grey blocks to move obstacles. <a href={GH + '3D-Motion-Planning-A-Star-RRT'} target="_blank" rel="noreferrer">3D Motion Planning (A*, RRT) ↗</a></p>
    </>
  )
}

function Cart() {
  const c = useFeature((s) => s.cart)
  const pushes = useGame((s) => s.pushes)
  return (
    <>
      <header><span className="zw-dot" /> <strong>Cart-pole · LQR</strong> <span className="mono muted">θ {(c.theta * 57.2958).toFixed(1).padStart(5)}°</span></header>
      <Spark data={c.history} />
      <p className="zw-status mono" aria-live="polite">
        {c.mode === 'off' ? (c.fallen ? 'Controller off: it fell over.' : 'Controller off: gravity wins…') : c.fallen ? 'Fallen. Hit reset.' : `Balancing · recoveries ${Math.min(pushes, 5)}/5`}
      </p>
      <div className="zw-row">
        <button className="primary" onClick={() => emit('cart:push')} disabled={c.mode === 'off' && c.fallen}>Push it</button>
        <button onClick={() => emit('cart:mode')} aria-pressed={c.mode === 'lqr'}>LQR {c.mode === 'lqr' ? 'on' : 'off'}</button>
        <button onClick={() => emit('cart:reset')}>Reset</button>
      </div>
      <p className="zw-foot">Gain from a discrete Riccati iteration, computed in your browser. <a href={GH + 'Discrete-Time-LQR-Control'} target="_blank" rel="noreferrer">Discrete-Time LQR Control ↗</a></p>
    </>
  )
}

function Launch() {
  const l = useFeature((s) => s.launch)
  const label = l.state === 'countdown' ? `T−${l.t}…` : l.state === 'flying' ? 'Liftoff! Through the hatch…' : l.state === 'landing' ? 'Booster coming back for a landing…' : 'Pad clear. Go for launch?'
  return (
    <>
      <header><span className="zw-dot" style={{ background: '#f59e0b' }} /> <strong>Launch pad</strong></header>
      <p className="zw-status mono" aria-live="polite">{label}</p>
      <div className="zw-row">
        <button className="primary" disabled={l.state !== 'idle'} onClick={() => emit('launch:go')}>Launch</button>
      </div>
      <p className="zw-foot">Or type <code>launch</code> in the terminal. A toy rocket, not a real vehicle.</p>
    </>
  )
}

/** Top-down plate view: draw a seam with mouse/touch; shows the detected seam, bead and torch. */
function PlateView({ disabled }: { disabled: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const W = 260, H = Math.round(260 * (PLATE.h / PLATE.w))
  const toPt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { u: ((e.clientX - r.left) / r.width - 0.5) * PLATE.w, v: ((e.clientY - r.top) / r.height - 0.5) * PLATE.h }
  }
  useEffect(() => {
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const c = ref.current
      if (!c) return
      const g = c.getContext('2d')!
      const X = (u: number) => (u / PLATE.w + 0.5) * W, Y = (v: number) => (v / PLATE.h + 0.5) * H
      g.clearRect(0, 0, W, H)
      g.fillStyle = '#5b6573'; g.fillRect(0, 0, W, H)
      g.fillStyle = '#1b2230'; g.fillRect(0, H / 2 - 1, W, 2) // butt joint
      const line = (pts: { u: number; v: number }[], color: string, w: number, dash: number[] = []) => {
        if (pts.length < 2) return
        g.setLineDash(dash); g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p.u), Y(p.v)) : g.moveTo(X(p.u), Y(p.v)))); g.stroke(); g.setLineDash([])
      }
      const showSeam = weld.phase === 'detected' || weld.phase === 'welding' || weld.phase === 'done'
      line(weld.drawn, 'rgba(248,250,252,0.85)', 2, showSeam ? [3, 4] : [])
      if (showSeam) line(weld.seam, '#4ade80', 2)
      if (weld.phase === 'scanning') { const x = weld.scan * W; g.fillStyle = 'rgba(239,68,68,0.25)'; g.fillRect(0, 0, x, H); g.fillStyle = '#ef4444'; g.fillRect(x - 1, 0, 2, H) }
      if (weld.bead.length) {
        const now = performance.now()
        weld.bead.forEach((b) => { const age = (now - b.t) / 1000; g.fillStyle = age < 1.5 ? '#fb923c' : age < 3.5 ? '#9a3412' : '#9ca3af'; g.fillRect(X(b.u) - 2, Y(b.v) - 2, 4, 4) })
      }
      if (weld.phase === 'welding') { g.fillStyle = '#e0f2fe'; g.beginPath(); g.arc(X(weld.tool.u), Y(weld.tool.v), 3.5, 0, Math.PI * 2); g.fill() }
      if (!weld.drawn.length) { g.fillStyle = 'rgba(241,245,249,0.75)'; g.font = '11px Space Grotesk, sans-serif'; g.textAlign = 'center'; g.fillText('draw a seam here, or on the plate', W / 2, H / 2 - 8) }
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [W, H])
  return (
    <canvas ref={ref} width={W} height={H} className="plate-view" role="img"
      aria-label="Weld plate, top view. Drag to draw a seam, or use the preset buttons."
      onPointerDown={(e) => { if (disabled || busy()) return; e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; setDrawn([toPt(e)]); emit('weld:changed') }}
      onPointerMove={(e) => { if (drawing.current) addDrawnPoint(toPt(e)) }}
      onPointerUp={() => { if (!drawing.current) return; drawing.current = false; setDrawn(weld.drawn); emit('weld:changed') }}
      onPointerCancel={() => { drawing.current = false }}
    />
  )
}

function Weld() {
  const w = useFeature((s) => s.weld)
  const best = useGame((s) => s.weldBest)
  const done = useGame((s) => !!s.done.weld)
  const b = w.phase === 'scanning' || w.phase === 'welding'
  const status =
    w.phase === 'idle' ? 'Draw a seam on the plate (or pick a preset).'
    : w.phase === 'drawn' ? 'Seam marked. Run the detector.'
    : w.phase === 'scanning' ? `Laser scan… ${Math.round(w.progress * 100)}%`
    : w.phase === 'detected' ? `Seam found · simulated CNN · confidence ${(w.confidence * 100).toFixed(0)}%`
    : w.phase === 'welding' ? `Welding… ${Math.round(Math.min(1, w.progress) * 100)}% · error ${w.rms.toFixed(1)} mm rms`
    : `Bead quality ${w.quality.toFixed(0)}/100 · ${w.quality >= CLEAN ? 'clean ✓' : `need ${CLEAN} for clean`}`
  return (
    <>
      <header><span className="zw-dot" style={{ background: '#fb923c' }} /> <strong>Weld cell · seam tracking</strong> <span className="mono muted">{w.phase}</span></header>
      <PlateView disabled={b} />
      <p className="zw-status mono" aria-live="polite">{status}</p>
      <div className="zw-row" role="group" aria-label="Seam presets">
        {PRESETS.map((k) => <button key={k} disabled={b} onClick={() => emit('weld:preset', k)}>{k === 'L' ? 'L-joint' : k[0].toUpperCase() + k.slice(1)}</button>)}
        <button disabled={b} onClick={() => emit('weld:clear')} aria-label="Clear seam">✕</button>
      </div>
      <div className="zw-row" style={{ marginTop: 6 }}>
        <button className={w.phase === 'drawn' ? 'primary' : ''} disabled={b || w.phase === 'idle'} onClick={() => emit('weld:detect')}>Detect seam</button>
        <button className={w.phase === 'detected' || w.phase === 'done' ? 'primary' : ''} disabled={b || w.phase === 'idle'} onClick={() => emit('weld:go')}>Weld</button>
      </div>
      <p className="zw-status mono weld-score">
        rms {w.rms.toFixed(1)} mm · max {w.max.toFixed(1)} mm · quality {w.quality.toFixed(0)} · best {best.toFixed(0)}{done ? ' ✓' : `/${CLEAN}`}
      </p>
      <button className="linkish" onClick={() => useSim.getState().open('experience', { project: 'argon-robotics' })}>Argon Robotics in Experience →</button>
      <p className="zw-foot">The detector is a simulated stand-in for a CNN, not a real model. The arm runs closed-form IK in your browser with speed and acceleration limits.</p>
    </>
  )
}

function DepthGraph({ d, sp }: { d: number[]; sp: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width, h = c.height, N = 80
    ctx.clearRect(0, 0, w, h)
    const y = (v: number) => 3 + (v / 3.5) * (h - 6)
    ctx.strokeStyle = 'rgba(148,170,200,0.18)'
    for (const m of [1, 2, 3]) { ctx.beginPath(); ctx.moveTo(0, y(m)); ctx.lineTo(w, y(m)); ctx.stroke() }
    const line = (arr: number[], color: string, dash: number[]) => {
      ctx.setLineDash(dash); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath()
      arr.forEach((v, i) => { const x = ((i + N - arr.length) / (N - 1)) * w; if (i) ctx.lineTo(x, y(v)); else ctx.moveTo(x, y(v)) })
      ctx.stroke(); ctx.setLineDash([])
    }
    line(sp, '#fbbf24', [4, 3])
    line(d, '#38bdf8', [])
    ctx.fillStyle = 'rgba(148,170,200,0.6)'; ctx.font = '9px JetBrains Mono, monospace'
    for (const m of [1, 2, 3]) ctx.fillText(`${m}m`, 2, y(m) - 2)
  }, [d, sp])
  return <canvas ref={ref} width={260} height={64} className="spark depth" aria-hidden="true" />
}

function Bar({ v, label }: { v: number; label: string }) {
  const pct = Math.max(-1, Math.min(1, v / PID.uMax)) * 50
  return (
    <span className="pid-bar" title={`${label} = ${v.toFixed(2)}`}>
      <span className="mono">{label}</span>
      <span className="track"><i style={{ left: pct < 0 ? `${50 + pct}%` : '50%', width: `${Math.abs(pct)}%` }} /></span>
    </span>
  )
}

function TankPanel() {
  const touch = useCoarsePointer()
  const vehicle = useGame((s) => s.vehicle)
  const beacons = useGame((s) => s.beacons)
  const acoustic = useGame((s) => s.acoustic)
  const tank = useFeature((s) => s.tank)
  const [, tick] = useState(0)
  const hist = useRef({ d: [] as number[], sp: [] as number[] })
  useEffect(() => {
    if (vehicle !== 'auv') return
    const id = setInterval(() => {
      const h = hist.current
      h.d.push(auv.depth); h.sp.push(auv.setpoint)
      if (h.d.length > 80) { h.d.shift(); h.sp.shift() }
      tick((n) => n + 1)
    }, 100)
    return () => clearInterval(id)
  }, [vehicle])
  const experience = (
    <button className="linkish" onClick={() => useSim.getState().open('experience')}>Yonder Deep &amp; Scripps in Experience →</button>
  )
  if (vehicle !== 'auv') {
    return (
      <>
        <header><span className="zw-dot" style={{ background: '#38bdf8' }} /> <strong>AUV test tank</strong></header>
        <p className="zw-status">Switch to the AUV to dive with PID depth hold, ping sonar and survey the floor.</p>
        <div className="zw-row"><button className="primary" onClick={() => useGame.getState().setVehicle('auv')}>Dive in the AUV</button></div>
        <p className="zw-foot">Based on my AUV software work. {experience}</p>
      </>
    )
  }
  const e = auv.setpoint - auv.depth
  const h = hist.current
  return (
    <>
      <header>
        <span className="zw-dot" style={{ background: '#38bdf8' }} /> <strong>AUV · depth hold</strong>
        <span className="mono muted">{auv.depth.toFixed(2)} m</span>
      </header>
      <DepthGraph d={h.d.slice()} sp={h.sp.slice()} />
      <p className="zw-status mono pid-line">
        {auv.hold ? <>setpoint {auv.setpoint.toFixed(2)} m · error {e >= 0 ? '+' : '−'}{Math.abs(e).toFixed(2)} · thrust {auv.u.toFixed(2)}</> : <>manual: Space/Shift drive the thruster directly</>}
      </p>
      {auv.hold && (
        <div className="pid-bars" aria-hidden="true"><Bar v={auv.p} label="P" /><Bar v={auv.i} label="I" /><Bar v={auv.d} label="D" /></div>
      )}
      <div className="zw-row">
        <button className="primary" onClick={() => emit('sonar:ping')}>Sonar{!touch && <>{' '}<kbd>Q</kbd></>}</button>
        {ACOUSTIC_DEPTHS.map((m) => (
          <button key={m} onClick={() => { auv.hold = true; auv.setpoint = Math.min(DEPTH_MAX, m) }} aria-label={`Hold ${m} metres`} className={acoustic.includes(m) ? 'done' : ''}>{m} m</button>
        ))}
        <button aria-pressed={auv.hold} onClick={() => { auv.hold = !auv.hold; auv.integ = 0 }}>Hold {auv.hold ? 'on' : 'off'}</button>
      </div>
      <p className="zw-status mono" aria-live="polite">
        beacons {beacons.length}/{BEACONS.length}{tank.contacts ? ` · ${tank.contacts} sonar contact${tank.contacts > 1 ? 's' : ''}` : ' · ping to find them'}
        {' · '}acoustic {ACOUSTIC_DEPTHS.map((m) => (acoustic.includes(m) ? '●' : '○')).join('')}
        {tank.recording != null && ` · recording ${tank.recording} m ${'▮'.repeat(Math.round(tank.progress * 5))}${'▯'.repeat(5 - Math.round(tank.progress * 5))}`}
      </p>
      <p className="zw-foot">WASD swim · Space/Shift or ▲▼ move the setpoint. Kp {PID.kp} · Ki {PID.ki} · Kd {PID.kd}. {experience}</p>
    </>
  )
}

const TITLES = { planning: 'Planning pad controls', cartpole: 'Cart-pole controls', launch: 'Launch pad controls', weld: 'Weld cell controls', tank: 'AUV test tank controls' } as const

export function ZoneWidget() {
  const zone = useSim((s) => s.zone)
  const open = useSim((s) => s.openStation || s.openSheet)
  if (open || !zone || !(zone in TITLES)) return null
  const z = zone as keyof typeof TITLES
  return (
    <section className="zone-widget" aria-label={TITLES[z]}>
      {z === 'planning' ? <Planner /> : z === 'cartpole' ? <Cart /> : z === 'launch' ? <Launch /> : z === 'tank' ? <TankPanel /> : <Weld />}
    </section>
  )
}
