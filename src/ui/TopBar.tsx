import { stations } from '../data/content'
import { useSim, visitStation } from '../store'
import { useGame } from '../game/store'
import { missions } from '../game/missions'

export function TopBar() {
  const open = useSim((s) => s.openStation)
  const near = useSim((s) => s.nearStation)
  const terminalOpen = useSim((s) => s.terminalOpen)
  const setTerminal = useSim((s) => s.setTerminal)
  const sheet = useSim((s) => s.openSheet)
  const doneCount = useGame((s) => missions.filter((m) => s.done[m.id]).length)
  const toggleSheet = (x: 'missions' | 'garage') => useSim.getState().openSheetFn(sheet === x ? null : x)
  return (
    <header className="topbar">
      <a className="skip" href="#plain">Skip to content (plain view)</a>
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); useSim.getState().close(); useSim.getState().teleportTo('home') }} aria-label="Girish Krishnan, Sim Lab home">
        <span className="logo" aria-hidden="true" />
        <span>
          <strong>Girish Krishnan</strong>
          <small>sim lab</small>
        </span>
      </a>
      <nav aria-label="Stations" className="stations-nav">
        <ul>
          {stations.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => visitStation(s.id)}
                aria-current={open === s.id ? 'page' : undefined}
                className={(open === s.id ? 'on ' : '') + (near === s.id ? 'near' : '')}
                style={{ ['--accent' as string]: s.color }}
                title={`${s.label} (key ${s.hotkey})`}
                aria-keyshortcuts={s.hotkey}
              >
                <span className="dot" aria-hidden="true" />{s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="top-actions">
        <button className="ghost" onClick={() => toggleSheet('missions')} aria-pressed={sheet === 'missions'} aria-label={`Missions, ${doneCount} of ${missions.length} complete`}>
          <span aria-hidden="true">★</span><span className="lbl">Missions</span> <span className="count mono" aria-hidden="true">{doneCount}/{missions.length}</span>
        </button>
        <button className="ghost" onClick={() => toggleSheet('garage')} aria-pressed={sheet === 'garage'} aria-label="Garage: choose vehicle and paint">
          <span aria-hidden="true">⚙</span><span className="lbl">Garage</span>
        </button>
        <button className="ghost" onClick={() => setTerminal(!terminalOpen)} aria-pressed={terminalOpen} aria-keyshortcuts="`">
          <span className="mono" aria-hidden="true">&gt;_</span><span className="lbl">Terminal</span>
        </button>
        <a className="ghost" href="#plain"><span className="lbl-short" aria-hidden="true">Aa</span><span className="lbl">Plain view</span></a>
      </div>
    </header>
  )
}
