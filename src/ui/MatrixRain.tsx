import { useEffect, useRef } from 'react'

/** `matrix` easter egg: faint falling glyphs over the scene. Static under reduced motion. */
export default function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const ctx = c.getContext('2d')!
    const glyphs = 'アカサタナハマヤラワ0123456789ΣπλθΔ∇∫'
    const fs = 16
    let cols = 0, drops: number[] = []
    const resize = () => {
      c.width = innerWidth; c.height = innerHeight
      cols = Math.ceil(c.width / fs)
      drops = Array.from({ length: cols }, () => Math.random() * -50)
    }
    resize()
    addEventListener('resize', resize)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    ctx.font = `${fs}px JetBrains Mono, monospace`
    const step = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)'
      ctx.fillRect(0, 0, c.width, c.height)
      ctx.fillStyle = '#4ade80'
      for (let i = 0; i < cols; i++) {
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * fs, drops[i] * fs)
        if (drops[i] * fs > c.height && Math.random() > 0.975) drops[i] = 0
        drops[i] += 1
      }
    }
    let id = 0
    if (reduced) { for (let k = 0; k < 60; k++) step() }
    else id = window.setInterval(step, 50)
    return () => { clearInterval(id); removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} className="matrix-rain" aria-hidden="true" />
}
