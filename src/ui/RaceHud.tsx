import { useSim } from '../store'
import { useRace } from '../game/race'
import { useGame } from '../game/store'
import { devGhost, fmtLap, CHECKPOINTS } from '../game/track'

export function RaceHud() {
  const zone = useSim((s) => s.zone)
  const hide = useSim((s) => !!(s.openStation || s.openSheet))
  const r = useRace()
  const best = useGame((s) => (s.laps.length ? Math.min(...s.laps.map((l) => l.ms)) : null))
  if (zone !== 'track' || hide) return null
  const delta = r.phase === 'running' ? r.lapMs - devPace(r.cp) : null
  return (
    <section className="race-hud" aria-label="Time trial">
      <div className="rh-main">
        <span className="rh-label">LAP</span>
        <span className="rh-time mono">{r.phase === 'running' ? fmtLap(r.lapMs) : '-:--.---'}</span>
        <span className="rh-cp mono" aria-label={`checkpoints ${r.cp} of ${CHECKPOINTS}`}>
          {Array.from({ length: CHECKPOINTS }, (_, k) => <i key={k} className={k < r.cp ? 'on' : ''} />)}
        </span>
      </div>
      <div className="rh-sub mono">
        <span>best {best != null ? fmtLap(best) : '—'}</span>
        <span className="gold">dev ghost {fmtLap(devGhost.lapMs)}</span>
        {delta != null && r.cp > 0 && <span className={delta < 0 ? 'ahead' : 'behind'}>{delta < 0 ? '−' : '+'}{(Math.abs(delta) / 1000).toFixed(2)}s</span>}
      </div>
      <p className="rh-msg" aria-live="polite">
        {r.invalid ?? (r.phase === 'armed' ? 'Cross the start line to begin a lap.' : r.offTrack ? 'Off track! Speed limited.' : r.lastMs != null && r.lapMs < 4000 ? `Last lap ${fmtLap(r.lastMs)}${r.lastBest ? ' · new best!' : ''}` : '')}
      </p>
      <div className="rh-actions">
        <button onClick={() => useSim.getState().openSheetFn('race')}>Leaderboard</button>
        <button aria-pressed={r.ghosts} onClick={() => r.set({ ghosts: !r.ghosts })}>Ghosts {r.ghosts ? 'on' : 'off'}</button>
      </div>
    </section>
  )
}

/** Dev ghost's elapsed time at checkpoint k (for the live delta). */
const cpTimes = (() => {
  // checkpoints are evenly spaced in arc length; find the ghost time at each fraction
  const s = devGhost.samples, out: number[] = [0]
  for (let k = 1; k <= CHECKPOINTS; k++) out.push(timeAtFraction(s, k / (CHECKPOINTS + 1)))
  return out
})()
function timeAtFraction(s: number[], f: number) {
  // distance-based lookup along the sample polyline
  let total = 0
  const n = s.length / 4
  const seg: number[] = [0]
  for (let i = 1; i < n; i++) { total += Math.hypot(s[i * 4 + 1] - s[(i - 1) * 4 + 1], s[i * 4 + 2] - s[(i - 1) * 4 + 2]); seg.push(total) }
  const target = f * total
  const i = seg.findIndex((d) => d >= target)
  return s[Math.max(0, i) * 4]
}
const devPace = (cp: number) => cpTimes[Math.min(cp, CHECKPOINTS)]
