import { useEffect, useState } from 'react'
import { useGame, type LapEntry } from '../game/store'
import { useSim } from '../store'
import { useRace } from '../game/race'
import { leaderboard, TRACK_ID, DEV_ENTRY } from '../game/leaderboard'
import { devGhost, fmtLap, track } from '../game/track'
import { vehicleById } from '../game/vehicles'

export function RaceSheet() {
  const laps = useGame((s) => s.laps)
  const callsign = useGame((s) => s.callsign)
  const vehicle = useGame((s) => s.vehicle)
  const ghosts = useRace((s) => s.ghosts)
  const [rows, setRows] = useState<LapEntry[]>([])
  const [name, setName] = useState(callsign)
  useEffect(() => { leaderboard.top(TRACK_ID, 10).then(setRows) }, [laps])
  const all = [...rows, DEV_ENTRY].sort((a, b) => a.ms - b.ms)
  const save = () => useGame.getState().set({ callsign: name.replace(/[^\w .'-]/g, '').trim().slice(0, 16) || 'visitor' })
  return (
    <div className="sec race-sheet">
      <p className="lead">
        A {Math.round(track.L)} m ring east of the lab: 8 checkpoints, rolling start. Beat <strong className="gold">Girish’s dev ghost</strong> ({fmtLap(devGhost.lapMs)}),
        a pace target from a curvature-limited speed profile, the kind of lap a tuned F1TENTH controller drives.
      </p>
      <div className="race-actions">
        <button className="cta sm" onClick={() => { useSim.getState().teleportTo('zone:track'); useSim.getState().close() }}>Go to the start line</button>
        {vehicle !== 'car' && (
          <button className="ghost" onClick={() => { if (useGame.getState().setVehicle('car')) { useSim.getState().teleportTo('zone:track'); useSim.getState().close() } }} disabled={!useGame.getState().done.tour}>
            {useGame.getState().done.tour ? 'Race in the F1TENTH car' : 'F1TENTH car: finish the lab tour'}
          </button>
        )}
        <button className="ghost" aria-pressed={ghosts} onClick={() => useRace.getState().set({ ghosts: !ghosts })}>Ghosts {ghosts ? 'on' : 'off'}</button>
      </div>
      <h3>Leaderboard <small className="muted">· this device</small></h3>
      <table className="lb">
        <thead><tr><th scope="col">#</th><th scope="col">Driver</th><th scope="col">Vehicle</th><th scope="col">Lap</th></tr></thead>
        <tbody>
          {all.map((e, i) => (
            <tr key={`${e.at}-${i}`} className={e === DEV_ENTRY ? 'dev' : ''}>
              <td>{i + 1}</td>
              <td>{e.callsign}</td>
              <td>{vehicleById(e.vehicle).name}</td>
              <td className="mono">{fmtLap(e.ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="muted">No laps yet. Your best lap also becomes your ghost.</p>}
      <form className="callsign" onSubmit={(e) => { e.preventDefault(); save() }}>
        <label htmlFor="callsign">Callsign</label>
        <input id="callsign" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} autoComplete="off" spellCheck={false} />
        <button className="ghost" type="submit">Save</button>
        {laps.length > 0 && <button className="ghost" type="button" onClick={() => useGame.getState().set({ laps: [], ghost: null })}>Clear my laps</button>}
      </form>
      <p className="muted small">Laps are stored in your browser only. The leaderboard sits behind a small service interface, so an online board can plug in later.</p>
    </div>
  )
}
