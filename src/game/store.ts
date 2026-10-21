import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { missionById, missions, type MissionId } from './missions'
import { paints, vehicles, type PaintId, type VehicleId } from './vehicles'
import { toast } from './toasts'
import type { StationId } from '../data/content'

export interface LapEntry { ms: number; vehicle: VehicleId; callsign: string; at: number }

interface GameState {
  visited: StationId[]
  done: Partial<Record<MissionId, number>>
  mapped: number // 0..1 coverage of the lab
  pushes: number
  plannerRan: { astar: boolean; rrt: boolean }
  vehicle: VehicleId
  /** what you were driving before you took the AUV (the exit-tank button switches back to it) */
  prevVehicle: VehicleId
  paint: PaintId
  lowGravity: boolean
  gravity: number
  slam: boolean
  matrix: boolean
  weldBest: number // best bead quality
  laps: LapEntry[]
  ghost: number[] | null // best-lap samples, flattened [t,x,z,h,...]
  callsign: string
  beacons: number[] // scanned survey beacons
  acoustic: number[] // depths (m) with a recorded acoustic sample
  visit: (id: StationId) => void
  complete: (id: MissionId) => void
  setVehicle: (v: VehicleId) => boolean
  setPaint: (p: PaintId) => boolean
  set: (p: Partial<GameState>) => void
  reset: () => void
}

const initial = {
  visited: [] as StationId[],
  done: {},
  mapped: 0,
  pushes: 0,
  plannerRan: { astar: false, rrt: false },
  vehicle: 'rover' as VehicleId,
  prevVehicle: 'rover' as VehicleId,
  paint: 'studio' as PaintId,
  lowGravity: false,
  gravity: -20,
  slam: false,
  matrix: false,
  weldBest: 0,
  laps: [] as LapEntry[],
  ghost: null,
  callsign: 'visitor',
  beacons: [] as number[],
  acoustic: [] as number[],
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...initial,
      visit: (id) => {
        const v = get().visited
        if (v.includes(id)) return
        const next = [...v, id]
        set({ visited: next })
        if (next.length >= 6) get().complete('tour')
        else toast(`Station ${next.length}/6 visited`, undefined, 'info')
      },
      complete: (id) => {
        if (get().done[id]) return
        set({ done: { ...get().done, [id]: Date.now() } })
        const m = missionById(id)
        toast(`Mission complete: ${m.title}`, `Unlocked: ${m.reward}`, 'mission')
      },
      setVehicle: (v) => {
        if (!isVehicleUnlocked(v)) return false
        const cur = get().vehicle
        set(v === 'auv' && cur !== 'auv' ? { vehicle: v, prevVehicle: cur } : { vehicle: v })
        return true
      },
      setPaint: (p) => {
        const def = paints.find((x) => x.id === p)
        if (!def || (def.unlock && !get().done[def.unlock])) return false
        set({ paint: p })
        return true
      },
      set: (p) => set(p),
      reset: () => set({ ...initial }),
    }),
    {
      name: 'simlab-v2',
      version: 2,
      // v2 (v2.4): the Ising floor became the weld cell. Drop its mission, paint and state.
      migrate: (persisted, from) => {
        const s = (persisted ?? {}) as Record<string, unknown> & { done?: Record<string, number>; paint?: string }
        if (from < 2) {
          if (s.done) { const { ising, ...rest } = s.done; void ising; s.done = rest }
          if (s.paint === 'ising') s.paint = 'studio'
          delete s.spinsFlipped; delete s.isingT
          s.weldBest = 0
        }
        return s as unknown as GameState
      },
      partialize: (s) => {
        const { visit, complete, setVehicle, setPaint, set, reset, ...rest } = s
        void visit; void complete; void setVehicle; void setPaint; void set; void reset
        return rest
      },
    },
  ),
)

export function isVehicleUnlocked(v: VehicleId) {
  const def = vehicles.find((x) => x.id === v)
  return !!def && (!def.unlock || !!useGame.getState().done[def.unlock])
}
/** Vehicle to climb out of the tank in: whatever you had before the AUV, else the rover. */
export function exitVehicle(): VehicleId {
  const p = useGame.getState().prevVehicle
  return p && p !== 'auv' && isVehicleUnlocked(p) ? p : 'rover'
}
export const missionCount = () => {
  const d = useGame.getState().done
  return { done: missions.filter((m) => d[m.id]).length, total: missions.length }
}
