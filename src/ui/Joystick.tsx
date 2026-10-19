import { useRef, useState } from 'react'
import { useSim } from '../store'

const R = 46

export function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const active = useRef<number | null>(null)
  const setJoy = useSim((s) => s.setJoystick)

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    let x = e.clientX - (r.left + r.width / 2)
    let y = e.clientY - (r.top + r.height / 2)
    const d = Math.hypot(x, y)
    if (d > R) { x = (x / d) * R; y = (y / d) * R }
    setKnob({ x, y })
    setJoy(x / R, y / R)
  }
  const end = () => { active.current = null; setKnob({ x: 0, y: 0 }); setJoy(0, 0) }

  return (
    <div
      ref={base}
      className="joystick"
      aria-hidden="true"
      onPointerDown={(e) => { active.current = e.pointerId; (e.target as Element).setPointerCapture(e.pointerId); update(e) }}
      onPointerMove={(e) => { if (active.current === e.pointerId) update(e) }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  )
}

/** Up/down buttons for the quadcopter and AUV on touch screens. */
export function AltitudeButtons({ kind }: { kind: 'fly' | 'swim' }) {
  const set = (v: number) => () => useSim.setState({ ascend: v })
  return (
    <div className="alt-btns">
      <button aria-label={kind === 'fly' ? 'Climb' : 'Surface'} onPointerDown={set(1)} onPointerUp={set(0)} onPointerCancel={set(0)} onPointerLeave={set(0)}>▲</button>
      <button aria-label={kind === 'fly' ? 'Descend' : 'Dive'} onPointerDown={set(-1)} onPointerUp={set(0)} onPointerCancel={set(0)} onPointerLeave={set(0)}>▼</button>
    </div>
  )
}

/** Hop button for ground vehicles on touch screens (low gravity only). */
export function HopButton() {
  const set = (v: number) => () => useSim.setState({ ascend: v })
  return (
    <div className="alt-btns hop">
      <button aria-label="Hop" onPointerDown={set(1)} onPointerUp={set(0)} onPointerCancel={set(0)} onPointerLeave={set(0)}>⤒</button>
    </div>
  )
}
