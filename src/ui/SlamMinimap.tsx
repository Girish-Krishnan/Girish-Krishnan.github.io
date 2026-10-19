import { useEffect, useRef } from 'react'
import { occ, OCC, resetMap } from '../algos/occupancy'
import { useGame } from '../game/store'

/** 2D occupancy-grid view of what the simulated LiDAR has mapped so far. */
export default function SlamMinimap() {
  const ref = useRef<HTMLCanvasElement>(null)
  const mapped = useGame((s) => s.mapped)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(OCC.n, OCC.n)
    const off = document.createElement('canvas')
    off.width = off.height = OCC.n
    const octx = off.getContext('2d')!
    let last = -1
    const draw = () => {
      const r = (window as any).__simlab?.robot
      if (occ.version !== last) {
        last = occ.version
        const d = img.data
        for (let k = 0; k < OCC.n * OCC.n; k++) {
          const p = k * 4
          if (!occ.seen[k]) { d[p] = 10; d[p + 1] = 14; d[p + 2] = 22; d[p + 3] = 255; continue }
          const l = occ.logodds[k]
          if (l > 0.6) { d[p] = 94; d[p + 1] = 234; d[p + 2] = 212 }
          else { const v = l < -0.8 ? 46 : 30; d[p] = v; d[p + 1] = v + 8; d[p + 2] = v + 20 }
          d[p + 3] = 255
        }
        octx.putImageData(img, 0, 0)
      }
      const W = c.width
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(off, 0, 0, W, W)
      const s = W / OCC.size
      const tx = (x: number) => (x - OCC.x0) * s, tz = (z: number) => (z - OCC.z0) * s
      ctx.strokeStyle = 'rgba(251,191,36,0.7)'; ctx.lineWidth = 1.2
      ctx.beginPath()
      occ.trail.forEach(([x, z], i) => (i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))))
      ctx.stroke()
      if (r) {
        ctx.save(); ctx.translate(tx(r.x), tz(r.z)); ctx.rotate(-r.heading)
        ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(4, -4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill()
        ctx.restore()
      }
    }
    const id = setInterval(draw, 150)
    draw()
    return () => clearInterval(id)
  }, [])
  return (
    <figure className="slam-map" aria-label={`SLAM occupancy map, ${Math.round(mapped * 100)} percent of the lab mapped`}>
      <canvas ref={ref} width={180} height={180} />
      <figcaption>
        <span className="mono">occupancy grid · {Math.round(mapped * 100)}% mapped</span>
        <span>
          <button className="linkish" onClick={() => { resetMap(); useGame.getState().set({ mapped: 0 }) }}>clear</button>
          {' · '}
          <a href="https://github.com/Girish-Krishnan/LiDAR-SLAM" target="_blank" rel="noreferrer">LiDAR SLAM ↗</a>
        </span>
      </figcaption>
    </figure>
  )
}
