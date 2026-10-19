import { Suspense, lazy } from 'react'
import { useGame } from '../game/store'
import { useSim } from '../store'

const SlamMinimap = lazy(() => import('./SlamMinimap'))

export function SlamToggle() {
  const slam = useGame((s) => s.slam)
  const ready = useSim((s) => s.sceneReady)
  const hide = useSim((s) => !!(s.openStation || s.openSheet))
  if (!ready || hide) return null
  return (
    <div className="slam-dock">
      {slam && <Suspense fallback={null}><SlamMinimap /></Suspense>}
      <button className={`slam-btn${slam ? ' on' : ''}`} aria-pressed={slam} onClick={() => useGame.getState().set({ slam: !slam })}>
        <span aria-hidden="true">◉</span> SLAM view
      </button>
    </div>
  )
}
