import { useEffect } from 'react'

export const keys = new Set<string>()
/** Keys pressed since the last frame consumed them (so a quick tap between two frames still counts). */
export const pressed = new Set<string>()

const MAP: Record<string, string> = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'rise', ShiftLeft: 'sink', ShiftRight: 'sink',
}

export function useDriveKeys(enabled: () => boolean) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = MAP[e.code]
      if (!k || !enabled()) return
      // don't hijack Space on focused buttons/links (keyboard activation)
      if (k === 'rise' && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return
      e.preventDefault()
      if (!e.repeat) pressed.add(k)
      keys.add(k)
    }
    const up = (e: KeyboardEvent) => { const k = MAP[e.code]; if (k) keys.delete(k) }
    const clear = () => { keys.clear(); pressed.clear() }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [enabled])
}
