import { create } from 'zustand'
import type { StationId } from './data/content'
import type { Zone } from './scene/layout'
import { useGame, exitVehicle } from './game/store'

export type Sheet = 'missions' | 'garage' | 'race'

export type Mode = '3d' | 'plain'

interface SimState {
  mode: Mode
  sceneReady: boolean
  openStation: StationId | null
  nearStation: StationId | null
  terminalOpen: boolean
  focusProject: string | null
  teleport: { id: StationId | 'home' | `zone:${string}`; nonce: number } | null
  joystick: { x: number; y: number }
  openSheet: Sheet | null
  ascend: number
  /** AUV is next to a tank wall: show the exit-tank button */
  canExitTank: boolean
  /** zone panel minimised to its header (phones) */
  zwMin: boolean
  setZwMin: (v: boolean) => void
  zone: Zone
  setZone: (z: Zone) => void
  openSheetFn: (s: Sheet | null) => void
  setMode: (m: Mode) => void
  setSceneReady: (v: boolean) => void
  open: (id: StationId, opts?: { project?: string }) => void
  close: () => void
  setNear: (id: StationId | null) => void
  setTerminal: (v: boolean) => void
  teleportTo: (id: StationId | 'home' | `zone:${string}`) => void
  setJoystick: (x: number, y: number) => void
}

export const useSim = create<SimState>((set) => ({
  mode: '3d',
  sceneReady: false,
  openStation: null,
  nearStation: null,
  terminalOpen: false,
  focusProject: null,
  teleport: null,
  joystick: { x: 0, y: 0 },
  openSheet: null,
  ascend: 0,
  canExitTank: false,
  zwMin: false,
  setZwMin: (zwMin) => set({ zwMin }),
  zone: null,
  setZone: (zone) => set({ zone }),
  openSheetFn: (openSheet) => set({ openSheet, openStation: null, focusProject: null }),
  setMode: (mode) => set({ mode }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  open: (id, opts) => set({ openStation: id, openSheet: null, focusProject: opts?.project ?? null }),
  close: () => set({ openStation: null, openSheet: null, focusProject: null }),
  setNear: (nearStation) => set({ nearStation }),
  setTerminal: (terminalOpen) => set({ terminalOpen }),
  teleportTo: (id) => set((s) => ({ teleport: { id, nonce: (s.teleport?.nonce ?? 0) + 1 } })),
  setJoystick: (x, y) => set({ joystick: { x, y } }),
}))

/** Climb out of the test tank: back to the vehicle used before the AUV, on the deck by the nearest wall. */
export function exitTank() {
  const s = useSim.getState()
  if (!s.canExitTank) return false
  useSim.setState({ canExitTank: false })
  useGame.getState().setVehicle(exitVehicle())
  return true
}

/** Go to a station: teleport the robot there and open its panel. */
export function visitStation(id: StationId, project?: string) {
  const s = useSim.getState()
  if (s.mode === '3d') s.teleportTo(id)
  s.open(id, { project })
}

// Small test/debug hook (used by the automated checks).
declare global {
  interface Window {
    __simlab?: { getState: typeof useSim.getState; robot?: { x: number; y?: number; z: number; heading: number }; place?: (x: number, z: number, y?: number, h?: number) => void }
  }
}
if (typeof window !== 'undefined') window.__simlab = { getState: useSim.getState }
