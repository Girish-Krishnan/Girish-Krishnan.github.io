import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { useSim } from './store'
import { hasWebGL, useCoarsePointer } from './hooks'
import { stations, type StationId } from './data/content'
import { TopBar } from './ui/TopBar'
import { Panel } from './ui/Panel'
import { Hud } from './ui/Hud'
import { Terminal } from './ui/Terminal'
import { Joystick, AltitudeButtons, HopButton } from './ui/Joystick'
import { Toasts } from './ui/Toasts'
import { useGame } from './game/store'
import { toast } from './game/toasts'
import { emit } from './game/bus'
import { vehicleById } from './game/vehicles'
import { PlainView } from './ui/PlainView'
import { ZoneWidget } from './ui/ZoneWidget'
import { SlamToggle } from './ui/SlamToggle'
import './game/commands'

const Scene = lazy(() => import('./scene/Scene'))
const MatrixRain = lazy(() => import('./ui/MatrixRain'))
const RaceHud = lazy(() => import('./ui/RaceHud').then((m) => ({ default: m.RaceHud })))

const isPlainHash = () => /^#(plain|content|sec-)/.test(location.hash)

/** Deep links: /#experience, /#projects/<slug>, plus aliases for old al-folio section names. */
const DEEP: Record<string, StationId> = {
  about: 'about', experience: 'experience', projects: 'projects', repositories: 'projects', research: 'research',
  publications: 'research', teaching: 'teaching', ta: 'teaching', contact: 'contact', cv: 'contact',
}
const deepLink = () => {
  const [a, b] = decodeURIComponent(location.hash.slice(1)).split('/')
  const id = DEEP[(a || '').toLowerCase()]
  return id ? { id, project: id === 'projects' && b ? b : undefined } : null
}

export default function App() {
  const webgl = useMemo(hasWebGL, [])
  const [plain, setPlain] = useState(() => isPlainHash())
  const ready = useSim((s) => s.sceneReady)
  const touch = useCoarsePointer()
  const openStation = useSim((s) => s.openStation)
  const openSheet = useSim((s) => s.openSheet)
  const zone = useSim((s) => s.zone)
  const matrix = useGame((s) => s.matrix)
  const ctl = useGame((s) => vehicleById(s.vehicle).control)
  const lowG = useGame((s) => s.lowGravity)

  // visiting a station counts toward the tour mission
  useEffect(() => useSim.subscribe((s, p) => { if (s.openStation && s.openStation !== p.openStation) useGame.getState().visit(s.openStation) }), [])

  useEffect(() => {
    const on = () => setPlain(isPlainHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  useEffect(() => { useSim.getState().setMode(plain || !webgl ? 'plain' : '3d') }, [plain, webgl])

  // station deep links: open the panel once the scene is ready (or jump to the section in the plain view)
  useEffect(() => {
    const go = () => {
      const d = deepLink()
      if (!d) return
      if (plain || !webgl) { document.getElementById(`sec-${d.id}`)?.scrollIntoView(); return }
      if (ready) useSim.getState().open(d.id, d.project ? { project: d.project } : undefined)
    }
    go()
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [ready, plain, webgl])

  // global keys: terminal toggle, station hotkeys, interact
  useEffect(() => {
    if (plain || !webgl) return
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
    const konami: string[] = []
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const s = useSim.getState()
      // Konami code → low gravity
      konami.push(e.key.length === 1 ? e.key.toLowerCase() : e.key)
      if (konami.length > KONAMI.length) konami.shift()
      if (konami.join(',') === KONAMI.join(',')) {
        konami.length = 0
        const g = useGame.getState()
        const on = !g.lowGravity
        g.set({ lowGravity: on, gravity: on ? -3.3 : -20 })
        g.complete('konami')
        toast(on ? 'Moon gravity' : 'Earth gravity', on ? '0.165 g. Press Space to hop; push the crates around.' : 'Back to 1 g.')
      }
      if (e.key === '`') { e.preventDefault(); s.setTerminal(!s.terminalOpen); return }
      if ((e.key === 'q' || e.key === 'Q') && s.zone === 'tank' && !s.openStation && !s.openSheet) { emit('sonar:ping'); return }
      if (s.openStation || s.openSheet) return
      if ((e.key === 'e' || e.key === 'E') && s.nearStation) { e.preventDefault(); s.open(s.nearStation) }
      const st = stations.find((x) => x.hotkey === e.key)
      if (st && !e.metaKey && !e.ctrlKey && !e.altKey) { s.teleportTo(st.id) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plain, webgl])

  if (plain || !webgl) return <PlainView noWebGL={!webgl} />

  return (
    <div className="app">
      <div
        className="stage"
        role="img"
        aria-label="Interactive 3D robotics lab. Drive the robot to stations, or use the Stations menu, the terminal, or the plain view for the same content."
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </div>
      {!ready && (
        <div className="boot" aria-live="polite">
          <div className="boot-ring" aria-hidden="true" />
          <p className="mono">booting simulation…</p>
        </div>
      )}
      <TopBar />
      <Hud />
      {touch && !openStation && !openSheet && <Joystick />}
      {touch && !openStation && !openSheet && (ctl === 'fly' || ctl === 'swim') && <AltitudeButtons kind={ctl} />}
      {touch && !openStation && !openSheet && lowG && (ctl === 'screen' || ctl === 'car') && <HopButton />}
      {matrix && <Suspense fallback={null}><MatrixRain /></Suspense>}
      <ZoneWidget />
      <SlamToggle />
      {zone === 'track' && <Suspense fallback={null}><RaceHud /></Suspense>}
      <Toasts />
      <Terminal />
      <Panel />
    </div>
  )
}
