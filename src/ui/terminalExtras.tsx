import type { ReactNode } from 'react'
import { useGame } from '../game/store'
import { missions } from '../game/missions'

type Line = { kind: 'in' | 'out' | 'err'; text: ReactNode }
const o = (text: ReactNode): Line => ({ kind: 'out', text })
const err = (text: ReactNode): Line => ({ kind: 'err', text })

/** Feature commands register here so the core terminal stays small. */
type Cmd = { name: string; help?: string; secret?: () => boolean; run: (args: string[]) => Line[] }
const registry: Cmd[] = []
export function registerCommand(c: Cmd) {
  const i = registry.findIndex((x) => x.name === c.name)
  if (i >= 0) registry[i] = c
  else registry.push(c)
}

const unlockedBy = (id: (typeof missions)[number]['id']) => () => !!useGame.getState().done[id]

export function extraCommands() {
  return registry.filter((c) => !c.secret || c.secret()).map((c) => c.name)
}
export function extraHelp(): string {
  const vis = registry.filter((c) => c.help && (!c.secret || c.secret()))
  return vis.length ? '\n\nfeature commands:\n' + vis.map((c) => `  ${c.help}`).join('\n') : ''
}
export function runExtra(cmd: string, args: string[]): Line[] | null {
  const c = registry.find((x) => x.name === cmd)
  if (!c) return null
  if (c.secret && !c.secret()) return [err(`${cmd}: command not found. type 'help'`)]
  return c.run(args)
}

// --- small always-on easter eggs ---
registerCommand({ name: 'euler', run: () => [o('e^(iπ) + 1 = 0   ·  five constants, one line. still the best equation.')] })
export { o as outLine, err as errLine, unlockedBy }
