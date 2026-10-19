import { useMemo } from 'react'
import * as THREE from 'three'
import { ARENA_RADIUS, WALL_SEGMENTS } from './layout'

/** A half-finished marker scrawl on the inside of one glass wall: ↑ ↑ ↓ ↓ … trailing off. */
export const GRAFFITI_SEG = 21 // 315°: a quiet stretch between the launch pad and the Experience station

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function drawScrawl(): HTMLCanvasElement {
  const W = 1024, H = 256
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const r = rng(7)
  g.lineCap = 'round'; g.lineJoin = 'round'
  const ink = (a: number) => `rgba(232, 121, 249, ${a})` // magenta marker
  // shaky polyline: a hand-drawn stroke between points
  const stroke = (pts: [number, number][], w: number, a: number) => {
    g.strokeStyle = ink(a); g.lineWidth = w
    g.beginPath()
    pts.forEach(([x, y], i) => {
      const jx = x + (r() - 0.5) * 5, jy = y + (r() - 0.5) * 5
      if (i === 0) g.moveTo(jx, jy)
      else {
        const [px, py] = pts[i - 1]
        g.quadraticCurveTo((px + jx) / 2 + (r() - 0.5) * 8, (py + jy) / 2 + (r() - 0.5) * 8, jx, jy)
      }
    })
    g.stroke()
  }
  const drip = (x: number, y: number, len: number, a: number) => {
    const grad = g.createLinearGradient(0, y, 0, y + len)
    grad.addColorStop(0, ink(a)); grad.addColorStop(1, ink(0))
    g.strokeStyle = grad; g.lineWidth = 4
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + len); g.stroke()
    g.fillStyle = ink(a * 0.6); g.beginPath(); g.arc(x, y + len * 0.85, 3.2, 0, Math.PI * 2); g.fill()
  }
  // arrow glyph: shaft + head, up (dir -1) or down (dir 1)
  const arrow = (cx: number, dir: 1 | -1, a: number, w: number, tilt: number) => {
    const top = 50 + tilt, bot = 200 + tilt * 0.5
    const tip = dir < 0 ? top : bot, tail = dir < 0 ? bot : top
    stroke([[cx + (r() - 0.5) * 6, tail], [cx + (r() - 0.5) * 4, (tail + tip) / 2], [cx, tip]], w, a)
    stroke([[cx - 40, tip - dir * 42], [cx, tip], [cx + 38, tip - dir * 46]], w, a)
    if (dir > 0) drip(cx + 2, bot + 4, 22 + r() * 30, a * 0.8)
    else drip(cx + 1, bot, 14 + r() * 26, a * 0.7)
  }
  arrow(90, -1, 0.95, 15, 0)
  arrow(225, -1, 0.85, 14, 6)
  arrow(365, 1, 0.7, 13, -4)
  arrow(500, 1, 0.5, 11, 8)
  // the next one barely started: a faint ← that gives up halfway
  stroke([[700, 128], [650, 124], [620, 120]], 9, 0.28)
  stroke([[655, 95], [622, 120], [652, 150]], 9, 0.22)
  // dots trailing off
  ;[[760, 140, 0.22], [810, 146, 0.15], [855, 150, 0.09]].forEach(([x, y, a]) => { g.fillStyle = ink(a); g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill() })
  // a scuffed underline that fades out
  const grad = g.createLinearGradient(40, 0, 760, 0)
  grad.addColorStop(0, ink(0.45)); grad.addColorStop(1, ink(0))
  g.strokeStyle = grad; g.lineWidth = 5
  g.beginPath(); g.moveTo(40, 236); g.bezierCurveTo(260, 228, 480, 244, 760, 232); g.stroke()
  return c
}

export function Graffiti() {
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(drawScrawl())
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return t
  }, [])
  const a = (GRAFFITI_SEG / WALL_SEGMENTS) * Math.PI * 2
  const rot = -a + Math.PI / 2
  return (
    // interior face of the glass: local -z points into the lab
    <group position={[Math.cos(a) * ARENA_RADIUS, 0, Math.sin(a) * ARENA_RADIUS]} rotation={[0, rot, 0]}>
      <mesh position={[-0.6, 0.5, -0.045]} rotation={[0, Math.PI, -0.04]}>
        <planeGeometry args={[3.0, 0.75]} />
        <meshBasicMaterial map={tex} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
