import { useGame, type LapEntry } from './store'
import { devGhost } from './track'

/**
 * Leaderboard behind a small async interface so an online backend can be dropped in later.
 *
 * A remote implementation would need:
 *  - an HTTP endpoint (e.g. Cloudflare Worker + D1/KV, Supabase, or Firebase) with
 *    `GET /laps?track=lab-ring&limit=10` and `POST /laps {track, ms, vehicle, callsign, ghost?}`;
 *  - validation server-side: plausible ms bounds (> ~15 s for this 330 m track), checkpoint
 *    splits submitted with the lap, a rate limit per IP, and a profanity filter on callsigns;
 *  - optional anti-cheat by replaying the submitted ghost samples against the track geometry
 *    (max speed / max lateral accel / checkpoint order);
 *  - CORS for girish-krishnan.github.io. GitHub Pages is static, so the backend has to live elsewhere.
 */
export const TRACK_ID = 'lab-ring'
export interface LeaderboardService {
  top(track: string, n?: number): Promise<LapEntry[]>
  submit(track: string, entry: LapEntry, ghost?: number[]): Promise<{ rank: number; best: boolean }>
}

export const DEV_ENTRY: LapEntry = { ms: devGhost.lapMs, vehicle: 'car', callsign: "Girish's dev ghost", at: 0 }

export class LocalLeaderboard implements LeaderboardService {
  async top(_track: string, n = 10) {
    return [...useGame.getState().laps].sort((a, b) => a.ms - b.ms).slice(0, n)
  }
  async submit(_track: string, entry: LapEntry, ghost?: number[]) {
    const g = useGame.getState()
    const prevBest = g.laps.length ? Math.min(...g.laps.map((l) => l.ms)) : Infinity
    const laps = [...g.laps, entry].sort((a, b) => a.ms - b.ms).slice(0, 10)
    const best = entry.ms < prevBest
    g.set({ laps, ...(best && ghost ? { ghost } : {}) })
    return { rank: laps.indexOf(entry) + 1, best }
  }
}

export const leaderboard: LeaderboardService = new LocalLeaderboard()
