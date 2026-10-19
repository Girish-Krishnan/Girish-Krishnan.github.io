import { create } from 'zustand'

/** Live (non-persisted) time-trial state, written by the track module, read by the HUD. */
export interface RaceState {
  phase: 'idle' | 'armed' | 'running'
  lapMs: number
  cp: number // checkpoints passed this lap
  lastMs: number | null
  lastBest: boolean
  ghosts: boolean
  offTrack: boolean
  invalid: string | null
  set: (p: Partial<RaceState>) => void
}
export const useRace = create<RaceState>((set) => ({
  phase: 'idle', lapMs: 0, cp: 0, lastMs: null, lastBest: false, ghosts: true, offTrack: false, invalid: null,
  set: (p) => set(p),
}))
