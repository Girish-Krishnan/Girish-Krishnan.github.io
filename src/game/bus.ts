import { create } from 'zustand'


/** Tiny command bus between DOM UI/terminal and lazily-loaded 3D feature modules. */
type Handler = (arg?: unknown) => void
const handlers = new Map<string, Set<Handler>>()
export function on(cmd: string, h: Handler) {
  if (!handlers.has(cmd)) handlers.set(cmd, new Set())
  handlers.get(cmd)!.add(h)
  return () => { handlers.get(cmd)!.delete(h) }
}
export function emit(cmd: string, arg?: unknown) {
  const hs = handlers.get(cmd)
  if (!hs || !hs.size) return false
  hs.forEach((h) => h(arg))
  return true
}

/** Live feature readouts shown in the zone widget. */
interface FeatureState {
  planner: { status: string; algo: 'astar' | 'rrt' | null; ms: number; expanded: number; nodes: number; length: number }
  cart: { theta: number; x: number; mode: 'lqr' | 'off'; fallen: boolean; history: number[] }
  weld: { phase: string; confidence: number; quality: number; rms: number; max: number; progress: number; version: number }
  launch: { state: 'idle' | 'countdown' | 'flying' | 'landing'; t: number }
  tank: { contacts: number; recording: number | null; progress: number; lastPing: number }
  set: <K extends keyof Omit<FeatureState, 'set'>>(k: K, v: Partial<FeatureState[K]>) => void
}
export const useFeature = create<FeatureState>((set) => ({
  planner: { status: 'Drag the blocks, then run a planner.', algo: null, ms: 0, expanded: 0, nodes: 0, length: 0 },
  cart: { theta: 0, x: 0, mode: 'lqr', fallen: false, history: [] },
  weld: { phase: 'idle', confidence: 0, quality: 0, rms: 0, max: 0, progress: 0, version: 0 },
  launch: { state: 'idle', t: 0 },
  tank: { contacts: 0, recording: null, progress: 0, lastPing: 0 },
  set: (k, v) => set((s) => ({ [k]: { ...s[k], ...v } }) as Partial<FeatureState>),
}))
if (typeof window !== 'undefined') (window as any).__simlabFeature = useFeature.getState
/** Per-frame values shared between scene modules (no React updates). */
export const live = { rocketY: 0, launching: false, secretOpen: false, hops: 0 }
