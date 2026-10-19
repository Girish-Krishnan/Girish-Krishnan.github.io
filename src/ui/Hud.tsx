import { Fragment, type ReactNode } from 'react'
import { stations } from '../data/content'
import { useSim } from '../store'
import { useCoarsePointer } from '../hooks'
import { useGame } from '../game/store'
import { useRace } from '../game/race'
import { vehicleById } from '../game/vehicles'

type Hint = { id: string; node: ReactNode }
const K = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>

/** Context-aware control hints: what the keys (or touch controls) do right now. */
export function useHints(touch: boolean): Hint[] {
  const vehicle = useGame((s) => s.vehicle)
  const lowG = useGame((s) => s.lowGravity)
  const near = useSim((s) => s.nearStation)
  const zone = useSim((s) => s.zone)
  const racing = useRace((s) => s.phase === 'running')
  const ctl = vehicleById(vehicle).control
  const h: Hint[] = []
  const ground = ctl === 'screen' || ctl === 'car'
  if (touch) {
    if (ctl === 'fly') h.push({ id: 'drive', node: <>stick fly · ▲▼ altitude</> })
    else if (ctl === 'swim') h.push({ id: 'drive', node: <>stick swim · ▲▼ depth setpoint</> })
    else h.push({ id: 'drive', node: <>stick {ctl === 'car' ? 'throttle + steer' : 'drive'}</> })
    if (ground && lowG) h.push({ id: 'hop', node: <>⤒ hop</> })
    if (zone === 'tank' && ctl === 'swim') h.push({ id: 'ctx', node: <>Sonar in the panel</> })
    else if (zone === 'tank') h.push({ id: 'ctx', node: <>Garage → AUV to dive</> })
    return h.map((x) => (x.id === 'drive' ? { ...x, id: 'drive-' + vehicle } : x))
  }
  // vehicle controls
  if (ctl === 'car') {
    h.push({ id: 'drive', node: <><K>W</K><K>S</K> throttle · <K>A</K><K>D</K> steer</> })
    h.push(lowG ? { id: 'hop', node: <><K>Space</K> hop</> } : { id: 'brake', node: <><K>Space</K> handbrake</> })
  } else if (ctl === 'fly') {
    h.push({ id: 'drive', node: <><K>W</K><K>A</K><K>S</K><K>D</K> fly · <K>Space</K> up · <K>Shift</K> down</> })
  } else if (ctl === 'swim') {
    h.push({ id: 'drive', node: <><K>W</K><K>A</K><K>S</K><K>D</K> swim · <K>Space</K>/<K>Shift</K> depth setpoint</> })
    h.push({ id: 'sonar', node: <><K>Q</K> sonar</> })
  } else {
    h.push({ id: 'drive', node: <><K>W</K><K>A</K><K>S</K><K>D</K> drive</> })
    if (lowG) h.push({ id: 'hop', node: <><K>Space</K> hop</> })
  }
  // context
  if (near) h.push({ id: 'near', node: <><K>E</K> open {stations.find((s) => s.id === near)?.label}</> })
  else if (zone === 'tank' && ctl !== 'swim') h.push({ id: 'ctx', node: <>Garage → AUV to dive</> })
  else if (zone === 'track') h.push({ id: 'ctx', node: racing ? <>hit every checkpoint · teleporting voids the lap</> : <>cross the line to start a lap</> })
  else if (zone === 'planning') h.push({ id: 'ctx', node: <>run A* / RRT in the panel</> })
  else if (zone === 'cartpole') h.push({ id: 'ctx', node: <>push the pole; LQR catches it</> })
  else if (zone === 'launch') h.push({ id: 'ctx', node: <>launch from the panel</> })
  else if (zone === 'weld') h.push({ id: 'ctx', node: <>draw a seam on the plate → Detect → Weld</> })
  // always
  h.push({ id: 'term', node: <><K>`</K> terminal</> })
  if (zone !== 'track' || !racing) h.push({ id: 'jump', node: <><K>1</K>–<K>6</K> stations</> })
  return h.map((x) => (x.id === 'drive' ? { ...x, id: 'drive-' + vehicle } : x.id === 'near' ? { ...x, id: 'near-' + near } : x))
}

export function Hud() {
  const near = useSim((s) => s.nearStation)
  const open = useSim((s) => s.openStation)
  const sheet = useSim((s) => s.openSheet)
  const ready = useSim((s) => s.sceneReady)
  const term = useSim((s) => s.terminalOpen)
  const touch = useCoarsePointer()
  const hints = useHints(touch)
  const st = stations.find((s) => s.id === near)
  return (
    <>
      {st && !open && (
        <button className="prompt" style={{ ['--accent' as string]: st.color }} onClick={() => useSim.getState().open(st.id)}>
          {!touch && <kbd>E</kbd>} Open <strong>{st.label}</strong>
        </button>
      )}
      {ready && !open && !sheet && !term && (
        <p className={'hint' + (touch ? ' touch' : '')} aria-hidden="true" data-hints={hints.map((x) => x.id).join(' ')}>
          {hints.map((x, i) => (
            <Fragment key={x.id}>
              {i > 0 && <span className="sep"> · </span>}
              <span className="hi">{x.node}</span>
            </Fragment>
          ))}
        </p>
      )}
      <div className="sr-only" aria-live="polite">{st && !open ? `Near ${st.label}. Press E to open.` : ''}</div>
    </>
  )
}
