import { useGame, isVehicleUnlocked } from '../game/store'
import { CLEAN } from '../game/weld'
import { missions } from '../game/missions'
import { vehicles, paints, type VehicleId } from '../game/vehicles'
import { useSim } from '../store'
import { toast } from '../game/toasts'

export function MissionsSheet() {
  const done = useGame((s) => s.done)
  const visited = useGame((s) => s.visited.length)
  const mapped = useGame((s) => s.mapped)
  const weldBest = useGame((s) => s.weldBest)
  const pushes = useGame((s) => s.pushes)
  const count = missions.filter((m) => done[m.id]).length
  const progress: Partial<Record<string, [number, number]>> = {
    tour: [visited, 6], mapper: [Math.round(mapped * 100), 80], weld: [Math.round(weldBest), CLEAN], balancer: [Math.min(pushes, 5), 5],
  }
  return (
    <div className="sec">
      <p className="lead">{count} of {missions.length} complete. Progress is saved in this browser.</p>
      <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={missions.length} aria-valuenow={count} aria-label="Missions complete">
        <span style={{ width: `${(count / missions.length) * 100}%` }} />
      </div>
      <ul className="missions">
        {missions.map((m) => {
          const ok = !!done[m.id]
          const secret = m.hidden && !ok
          const pr = progress[m.id]
          return (
            <li key={m.id} className={ok ? 'ok' : secret ? 'locked' : ''}>
              <span className="check" aria-hidden="true">{ok ? '✓' : secret ? '?' : ''}</span>
              <div>
                <strong>{secret ? <><span aria-hidden="true">???</span><span className="sr-only">Locked secret mission</span></> : m.title}</strong>
                <p className="muted">{secret ? <em className="locked-hint">{m.lockedHint ?? 'Keep exploring…'}</em> : m.desc}</p>
                {!ok && !secret && pr && (
                  <div className="meter sm" aria-label={`${pr[0]} of ${pr[1]}`}><span style={{ width: `${Math.min(100, (pr[0] / pr[1]) * 100)}%` }} /></div>
                )}
                <p className="reward">{ok ? 'Unlocked: ' : 'Reward: '}{secret ? '???' : m.reward}</p>
                {!ok && !secret && <details><summary>Hint</summary><p className="muted">{m.hint}</p></details>}
              </div>
            </li>
          )
        })}
      </ul>
      <button className="ghost small" onClick={() => { if (confirm('Reset all mission progress, unlocks, and lap times saved in this browser?')) { useGame.getState().reset(); toast('Progress reset') } }}>
        Reset progress
      </button>
    </div>
  )
}

export function GarageSheet() {
  const current = useGame((s) => s.vehicle)
  const paint = useGame((s) => s.paint)
  const done = useGame((s) => s.done)
  const pick = (id: VehicleId) => {
    if (useGame.getState().setVehicle(id)) { toast(`${vehicles.find((v) => v.id === id)!.name} selected`); useSim.getState().close() }
  }
  return (
    <div className="sec">
      <p className="lead">Every vehicle here is a nod to something I actually built or worked on.</p>
      <ul className="garage">
        {vehicles.map((v) => {
          const unlocked = isVehicleUnlocked(v.id)
          const m = missions.find((x) => x.id === v.unlock)
          return (
            <li key={v.id} className={(current === v.id ? 'on ' : '') + (unlocked ? '' : 'locked')}>
              <div className="g-head">
                <div>
                  <h4>{v.name}</h4>
                  <span className="tag">{v.tagline}</span>
                </div>
                <button className="cta sm" disabled={!unlocked || current === v.id} onClick={() => pick(v.id)} aria-label={unlocked ? `Drive the ${v.name}` : `${v.name} is locked`}>
                  {current === v.id ? 'Driving' : unlocked ? 'Drive' : '🔒 Locked'}
                </button>
              </div>
              <p>{v.story}</p>
              <p className="muted small">Controls: {v.controls}{!unlocked && m ? ` · Unlock: complete “${m.title}” (${m.desc.toLowerCase()})` : ''}</p>
              {unlocked && <p className="small">{v.links.map((l) => <a key={l.href} className="pill" href={l.href} target={l.href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{l.label}{l.href.startsWith('#') ? '' : ' ↗'}</a>)}</p>}
            </li>
          )
        })}
      </ul>
      <h3>Paint</h3>
      <ul className="paints" role="radiogroup" aria-label="Paint job">
        {paints.map((p) => {
          const unlocked = !p.unlock || !!done[p.unlock]
          const m = missions.find((x) => x.id === p.unlock)
          return (
            <li key={p.id}>
              <button
                role="radio"
                aria-checked={paint === p.id}
                disabled={!unlocked}
                className={paint === p.id ? 'on' : ''}
                onClick={() => useGame.getState().setPaint(p.id)}
                title={unlocked ? p.name : `Locked: ${m?.title}`}
              >
                <span className="swatch" style={{ background: `linear-gradient(135deg, ${p.body} 60%, ${p.accent} 60%)` }} aria-hidden="true" />
                <span>{p.name}</span>
                {!unlocked && <span className="muted small">🔒 {m?.title}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
